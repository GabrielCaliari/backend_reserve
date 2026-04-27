# Subscriptions — Comparação, Análise e Melhorias

> Este documento compara como o sistema de subscriptions funciona **neste projeto (referência)** vs **no backend destino (zarp-subscriptions)**, aponta o que pode ser melhorado em lógica e segurança, e serve de guia para evoluir a implementação.

---

## 1. Como funciona AQUI (este projeto)

### Modelo de dados

O projeto usa três entidades principais para pagamentos:

**`Plan`** — plano cadastrado no banco, com referência direta aos IDs do Stripe:
```
id, slug, plan_name
external_plan_id              → price_id do Stripe (recorrência)
external_plan_trial_period_id → price_id do Stripe (trial)
billing_period                → enum numérico (weekly/monthly/quarterly/yearly)
released_credits              → créditos liberados ao assinar
credits_released_trial_period → créditos liberados no trial
guest_limit                   → limite de membros na organização
```

**`PlanReleaseLog`** — log de cada pagamento/liberação de plano:
```
subscription_id  → ID da subscription no Stripe (UNIQUE — 1 log por subscription)
external_plan_id → price_id do Stripe
amount, currency → valor pago
in_trial_period  → se estava em trial
status           → 1 = ativo
```

**`Credit`** — créditos consumíveis gerados ao assinar:
```
external_id  → referência ao price_id do plano
expires_in   → data de expiração calculada pelo billing_period
status       → active/used/expired/revoked
```

**`CreditPackage`** — pacotes avulsos de créditos (compra única):
```
external_credit_package_id → price_id do Stripe (modo payment, não subscription)
released_credits           → quantos créditos libera
```

### Fluxo atual

```
1. Admin cadastra Plan no banco com os price_ids do Stripe (manual, via seed/admin)

2. Usuário chama POST /plan/create-payment-link
   → Backend busca o plano pelo slug
   → Cria checkout session no Stripe com dois line_items:
     - external_plan_trial_period_id (trial de 7 dias)
     - external_plan_id (recorrência)
   → Retorna a URL do checkout

3. Usuário paga no Stripe Hosted Checkout

4. Stripe dispara webhook para... NENHUM ENDPOINT PRÓPRIO
   → O webhook é processado externamente (Make/Zapier/n8n ou chamada direta)
   → Chama PUT /plan/update com { user_id, external_id, subscription_id, in_trial_period }
   → Backend vincula o plano à organização, cria créditos, registra o log

5. Usuário acessa POST /plan/create-management-link
   → Backend busca o customer no Stripe pelo email
   → Retorna URL do Billing Portal do Stripe (gerenciamento de assinatura)

6. Cancelamento/revogação via POST /plan/revoke
   → Revoga créditos ativos, remove plano da organização
   → NÃO cancela no Stripe (precisa ser feito manualmente ou via portal)
```

### O que está faltando aqui (problemas identificados)

| Problema | Impacto | Severidade |
|----------|---------|------------|
| Webhook sem validação de assinatura Stripe | Qualquer um pode chamar `/plan/update` e liberar plano para qualquer usuário | 🔴 Crítico |
| Rotas de webhook sem autenticação | `/plan/update`, `/plan/revoke`, `/plan/release-credit-package` são públicas | 🔴 Crítico |
| Sem endpoint de webhook próprio | Depende de ferramenta externa (Make/n8n) para processar eventos do Stripe | 🟡 Alto |
| Cancelamento não reflete no Stripe | `revokePlan` só remove localmente, não cancela a subscription no Stripe | 🟡 Alto |
| Busca de customer por email | `findCustomerByEmail` é frágil — email pode mudar, customer pode ter múltiplos registros | 🟡 Alto |
| Sem idempotência no webhook | Se o mesmo evento for processado duas vezes, cria créditos duplicados | 🟡 Alto |
| `subscription_id` UNIQUE no PlanReleaseLog | Impede renovações mensais de gerar novos logs (cada renovação tem o mesmo subscription_id) | 🟠 Médio |
| Stripe inicializado no construtor | Se `STRIPE_SECRET_KEY` não estiver configurada, a aplicação não sobe | 🟠 Médio |
| `user_id` passado no body do webhook | Permite que qualquer chamada externa libere plano para qualquer usuário | 🔴 Crítico |

---

## 2. Como funciona NO BACKEND DESTINO (zarp-subscriptions)

Resumo do que foi implementado (detalhes completos em `payments-implementation-reference.md`):

- **Billing config por tenant** com chaves Stripe criptografadas (AES-256-GCM)
- **Webhook próprio** com validação de assinatura por tenant (`/api/webhooks/stripe/:tenantId`)
- **Idempotência** via tabela `stripe_webhook_events` (nunca processa o mesmo evento duas vezes)
- **Subscription local** com campos calculados (`isActive`, `daysRemaining`, `isInTrial`)
- **Cancelamento** que reflete no Stripe (imediato ou no fim do período)
- **Entidades de domínio** com lógica de negócio encapsulada

---

## 3. O que o backend destino tem de melhor (e por quê)

### 3.1 Webhook com validação de assinatura

**Aqui:** sem validação — qualquer POST para `/plan/update` libera plano.

**Lá:** o webhook valida a assinatura HMAC do Stripe antes de processar qualquer coisa:
```typescript
// Stripe assina o payload com o webhook secret
// Se a assinatura não bater, retorna 400 imediatamente
const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
```

Isso garante que só o Stripe pode disparar eventos de liberação de plano.

### 3.2 Idempotência de eventos

**Aqui:** sem controle — o mesmo evento processado duas vezes cria créditos duplicados.

**Lá:** antes de processar, verifica se o `stripe_event_id` já existe:
```typescript
const existing = await webhookEventRepo.findByStripeEventId(event.id);
if (existing) return; // ignora silenciosamente
```

### 3.3 Criptografia das chaves Stripe

**Aqui:** `STRIPE_SECRET_KEY` fica só em variável de ambiente (global para todos).

**Lá:** cada tenant tem sua própria chave, criptografada com AES-256-GCM no banco. A chave nunca é retornada pela API — só booleanos `hasStripeSecretKey`.

### 3.4 Cancelamento que reflete no Stripe

**Aqui:** `revokePlan` só remove localmente. O usuário continua com a subscription ativa no Stripe.

**Lá:** `CancelSubscriptionUseCase` chama o Stripe antes de atualizar o banco:
```typescript
// cancelAtPeriodEnd: false → cancela agora
// cancelAtPeriodEnd: true  → cancela no fim do período (recomendado)
await stripe.subscriptions.cancel(subscriptionId);
```

---

## 4. O que melhorar AQUI (priorizado)

### 🔴 Prioridade 1 — Segurança crítica

#### 4.1 Implementar webhook próprio com validação de assinatura

Criar um endpoint dedicado que recebe eventos do Stripe e valida a assinatura:

```typescript
// plan.controller.ts
@Post('/webhook/stripe')
async stripeWebhook(
  @Req() req: Request & { rawBody: Buffer },
  @Res() res: Response,
  @Headers('stripe-signature') signature: string,
) {
  if (!signature) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event: Stripe.Event;
  try {
    event = this.stripeProvider.constructWebhookEvent(
      req.rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  await this.planService.processStripeEvent(event);
  return res.status(200).json({ received: true });
}
```

E no `main.ts`, antes do `ValidationPipe`:
```typescript
app.use(
  '/plan/webhook/stripe',
  json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
```

#### 4.2 Remover `user_id` do body das rotas de webhook

As rotas `/plan/update` e `/plan/revoke` recebem `user_id` no body — isso significa que qualquer pessoa pode liberar plano para qualquer usuário. O `user_id` deve vir do metadata do evento Stripe, não do body da requisição.

No checkout, o metadata já é enviado:
```typescript
metadata: {
  user_id: user_id.toString(),
  plan_slug: plan.slug,
  organization_id: organization.organization.id.toString(),
}
```

No processamento do webhook, ler de lá:
```typescript
const userId = parseInt(event.data.object.metadata.user_id);
const planSlug = event.data.object.metadata.plan_slug;
```

#### 4.3 Adicionar idempotência no processamento de eventos

Criar uma tabela de log de eventos para evitar processamento duplicado:

```sql
-- Nova tabela
stripe_webhook_events (
  id              SERIAL PK,
  stripe_event_id VARCHAR(255) UNIQUE,  -- garante idempotência
  event_type      VARCHAR(100),
  processed       BOOLEAN DEFAULT false,
  error_message   TEXT,
  created_at      TIMESTAMP
)
```

No service, antes de processar:
```typescript
const alreadyProcessed = await this.webhookEventRepo.existsByStripeEventId(event.id);
if (alreadyProcessed) return; // idempotente
```

### 🟡 Prioridade 2 — Lógica e consistência

#### 4.4 Cancelamento que reflete no Stripe

Adicionar método no `StripeProvider` para cancelar subscription e chamar no `revokePlan`:

```typescript
// StripeProvider
async cancelSubscription(subscriptionId: string, atPeriodEnd = true): Promise<void> {
  if (atPeriodEnd) {
    await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  } else {
    await this.stripe.subscriptions.cancel(subscriptionId);
  }
}
```

Para isso, o `PlanReleaseLog` precisa guardar o `subscription_id` de forma que seja consultável por `organization_id` (hoje o campo é UNIQUE, o que impede renovações).

#### 4.5 Corrigir o UNIQUE no PlanReleaseLog

O campo `subscription_id` como UNIQUE impede que renovações mensais gerem novos logs. Uma subscription mensal tem o mesmo `subscription_id` por toda a vida — o que muda é o `invoice_id` a cada renovação.

**Solução:** remover o UNIQUE de `subscription_id` e adicionar um campo `invoice_id` para identificar cada cobrança individualmente:

```prisma
model PlanReleaseLog {
  // ...
  subscription_id  String   @db.VarChar(100)  // sem @unique
  invoice_id       String?  @unique @db.VarChar(100)  // único por cobrança
  // ...
}
```

#### 4.6 Lazy initialization do Stripe

Hoje o Stripe é instanciado no construtor — se `STRIPE_SECRET_KEY` não estiver configurada, a aplicação não sobe:

```typescript
// Atual (problemático)
constructor() {
  this.stripe = new Stripe(env('STRIPE_SECRET_KEY'), { ... });
}

// Melhorado (lazy)
private _stripe: Stripe | null = null;

private get stripe(): Stripe {
  if (!this._stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
    this._stripe = new Stripe(key, { apiVersion: '2025-08-27.basil' });
  }
  return this._stripe;
}
```

#### 4.7 Busca de customer por email → guardar customer_id

`findCustomerByEmail` é frágil. O correto é guardar o `stripe_customer_id` no banco quando o customer é criado (via webhook `customer.created` ou no retorno do checkout) e usar esse ID nas chamadas subsequentes.

Adicionar campo na `Organization` ou no `PlanReleaseLog`:
```prisma
model Organization {
  // ...
  stripe_customer_id  String?  @db.VarChar(100)
}
```

### 🟠 Prioridade 3 — Melhorias de produto

#### 4.8 Processar renovações automáticas

Hoje o sistema só processa o evento inicial de assinatura. Renovações mensais (`invoice.paid`) não atualizam os créditos nem geram novo `PlanReleaseLog`.

Eventos a tratar no webhook:

| Evento | Ação |
|--------|------|
| `checkout.session.completed` | Vincular plano, criar créditos iniciais |
| `customer.subscription.created` | Registrar subscription_id |
| `customer.subscription.updated` | Atualizar status local |
| `customer.subscription.deleted` | Revogar plano e créditos |
| `invoice.paid` | Renovação: criar novos créditos, novo PlanReleaseLog |
| `invoice.payment_failed` | Marcar organização como inadimplente |

#### 4.9 Status de inadimplência na Organization

Quando `invoice.payment_failed` chega, o sistema não faz nada. Adicionar um campo de status na organização:

```prisma
model Organization {
  // ...
  subscription_status  String?  @default("active") @db.VarChar(50)
  // active | past_due | canceled | trialing
}
```

E um guard que bloqueia operações quando `subscription_status = 'past_due'`.

---

## 5. Comparação lado a lado

| Aspecto | Este projeto | Backend destino |
|---------|-------------|-----------------|
| Webhook com validação de assinatura | ❌ Não tem | ✅ Sim |
| Idempotência de eventos | ❌ Não tem | ✅ Sim |
| Cancelamento reflete no Stripe | ❌ Não | ✅ Sim |
| Criptografia de chaves Stripe | ❌ Só env var | ✅ AES-256-GCM por tenant |
| Subscription local com status | ❌ Não tem | ✅ Tabela dedicada |
| Campos calculados (daysRemaining, isActive) | ❌ Não tem | ✅ Sim |
| Renovações automáticas tratadas | ❌ Não | ⚠️ Parcial |
| Billing Portal (gerenciamento) | ✅ Sim | ❌ Não implementado |
| Pacotes de créditos avulsos | ✅ Sim | ❌ Não implementado |
| Multi-tenant com chaves separadas | ❌ Não | ✅ Sim |

---

## 6. Ordem de implementação sugerida

Se for evoluir este projeto, a ordem recomendada é:

1. **Webhook com validação de assinatura** — elimina o maior risco de segurança
2. **Idempotência** — evita créditos duplicados
3. **Remover `user_id` do body** — ler do metadata do evento
4. **Tratar `invoice.paid`** — renovações automáticas criam créditos
5. **Guardar `stripe_customer_id`** — eliminar busca por email
6. **Cancelamento no Stripe** — consistência entre banco e Stripe
7. **Status de inadimplência** — bloquear acesso quando pagamento falha
8. **Corrigir UNIQUE no PlanReleaseLog** — permitir múltiplos logs por subscription

---

*Documento gerado em 24/04/2026 — baseado na análise do código atual e comparação com o backend destino.*
