# Stripe — Gerenciamento de Produtos (MVP)

> Este documento descreve como evoluir o sistema de pagamentos para ser **mais independente do Stripe Dashboard**, controlando produtos, preços e planos diretamente pela API do backend. Foco no MVP de payments.

---

## 1. O problema atual

Hoje o fluxo de cadastro de um plano é:

```
1. Acessa o Stripe Dashboard manualmente
2. Cria um Product no Stripe
3. Cria um Price no Stripe (mensal, anual, etc.)
4. Copia o price_id (ex: price_1ABC...)
5. Abre o banco de dados ou seed
6. Insere o Plan com external_plan_id = 'price_1ABC...'
```

Isso significa que **qualquer mudança de plano exige acesso ao Stripe Dashboard + acesso ao banco**. Não há como um admin criar ou editar planos pela própria aplicação.

---

## 2. O que o MVP deve resolver

- Criar produtos e preços no Stripe via API do backend
- Sincronizar o banco local com o que foi criado no Stripe
- Listar planos disponíveis (com dados do Stripe + dados locais)
- Arquivar/desativar planos sem deletar histórico
- Não depender do Stripe Dashboard para operações do dia a dia

O que **não** entra no MVP:
- Upgrade/downgrade de plano
- Múltiplos preços por produto (ex: mensal + anual na mesma tela)
- Cupons e promoções
- Faturamento por uso (metered billing)

---

## 3. Novos métodos no StripeProvider

Adicionar ao `src/core/providers/Stripe.ts`:

```typescript
// Criar produto no Stripe
async createProduct({
  name,
  description,
  metadata = {},
}: {
  name: string;
  description?: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Product> {
  return this.stripe.products.create({ name, description, metadata });
}

// Criar preço recorrente vinculado a um produto
async createPrice({
  productId,
  unitAmount,
  currency,
  interval,
  intervalCount = 1,
  trialPeriodDays,
  metadata = {},
}: {
  productId: string;
  unitAmount: number;       // em centavos
  currency: string;         // 'brl'
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount?: number;
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
}): Promise<Stripe.Price> {
  return this.stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency,
    recurring: {
      interval,
      interval_count: intervalCount,
      ...(trialPeriodDays ? { trial_period_days: trialPeriodDays } : {}),
    },
    metadata,
  });
}

// Arquivar produto (não deleta, só desativa)
async archiveProduct(productId: string): Promise<Stripe.Product> {
  return this.stripe.products.update(productId, { active: false });
}

// Arquivar preço
async archivePrice(priceId: string): Promise<Stripe.Price> {
  return this.stripe.prices.update(priceId, { active: false });
}

// Listar produtos ativos
async listProducts(): Promise<Stripe.Product[]> {
  const response = await this.stripe.products.list({ active: true, limit: 100 });
  return response.data;
}

// Listar preços de um produto
async listPricesForProduct(productId: string): Promise<Stripe.Price[]> {
  const response = await this.stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
  });
  return response.data;
}

// Construir e validar evento de webhook
constructWebhookEvent(
  rawBody: Buffer,
  signature: string,
  secret: string,
): Stripe.Event {
  return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
}
```

---

## 4. Mudanças no schema do banco

### 4.1 Evoluir o modelo `Plan`

O `Plan` atual guarda apenas dois price_ids (trial + recorrência). Para suportar criação via API, precisa guardar também o `product_id` do Stripe e metadados de controle:

```prisma
model Plan {
  id                            Int      @id @default(autoincrement())
  slug                          String   @unique @db.VarChar(100)
  plan_name                     String   @db.VarChar(100)
  description                   String?  @db.Text

  // IDs do Stripe
  stripe_product_id             String   @unique @db.VarChar(100)  // novo
  external_plan_id              String   @unique @db.VarChar(100)  // price_id recorrência
  external_plan_trial_period_id String?  @unique @db.VarChar(100)  // price_id trial (opcional)

  // Configuração de cobrança
  billing_period                Int      @db.SmallInt
  unit_amount                   Int      @default(0)               // novo — valor em centavos
  currency                      String   @default("brl") @db.VarChar(3) // novo

  // Limites e créditos
  released_credits              Int      @default(0) @db.SmallInt
  credits_released_trial_period Int      @default(0) @db.SmallInt
  guest_limit                   Int      @default(0) @db.SmallInt
  trial_days                    Int      @default(7) @db.SmallInt  // novo

  // Controle
  active                        Boolean  @default(true)            // novo
  created_at                    DateTime @default(now())
  updated_at                    DateTime @updatedAt

  Organization                  Organization[]
  PlanReleaseLog                PlanReleaseLog[]
  CreditPackageReleaseLog       CreditPackageReleaseLog[]
}
```

### 4.2 Corrigir PlanReleaseLog

Remover o UNIQUE de `subscription_id` e adicionar `invoice_id` para idempotência por cobrança:

```prisma
model PlanReleaseLog {
  id                 Int          @id @default(autoincrement())
  payment_platform   String       @db.VarChar(50)
  subscription_id    String       @db.VarChar(100)        // sem @unique
  invoice_id         String?      @unique @db.VarChar(100) // novo — único por cobrança
  status             Int          @db.SmallInt
  amount             Decimal      @db.Money
  in_trial_period    Boolean      @default(false)
  currency           String       @db.VarChar(50)
  external_credit_id String       @db.VarChar(255)
  external_plan_id   String       @db.VarChar(255)
  plan_id            Int
  Plan               Plan         @relation(fields: [plan_id], references: [id])
  organization_id    Int
  Organization       Organization @relation(fields: [organization_id], references: [id])
  user_id            Int
  User               User         @relation(fields: [user_id], references: [id])
  created_at         DateTime     @default(now())
  updated_at         DateTime     @updatedAt
}
```

### 4.3 Adicionar stripe_customer_id e subscription_status na Organization

```prisma
model Organization {
  // campos existentes...
  stripe_customer_id   String?  @db.VarChar(100)  // novo
  subscription_status  String?  @default("none") @db.VarChar(50)
  // none | trialing | active | past_due | canceled
}
```

---

## 5. Novo módulo de gerenciamento de planos

### 5.1 Endpoints propostos

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| `GET` | `/plan/admin/list` | AdminGuard | Listar todos os planos (ativos e inativos) |
| `POST` | `/plan/admin/create` | AdminGuard | Criar produto + preço no Stripe e salvar no banco |
| `PATCH` | `/plan/admin/:id` | AdminGuard | Atualizar metadados locais (nome, créditos, limites) |
| `DELETE` | `/plan/admin/:id` | AdminGuard | Arquivar plano (desativa no Stripe + marca inactive no banco) |
| `GET` | `/plan/list` | UserAuthGuard | Listar planos ativos para o usuário ver |

### 5.2 DTO de criação

```typescript
export class CreatePlanDTO {
  @IsNotEmpty()
  @IsString()
  plan_name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsString()
  slug: string;

  @IsNotEmpty()
  @IsNumber()
  @IsInt()
  unit_amount: number; // em centavos — ex: 9990 = R$ 99,90

  @IsNotEmpty()
  @IsIn(['brl', 'usd'])
  currency: string;

  @IsNotEmpty()
  @IsIn([1, 2, 3, 4]) // weekly, monthly, quarterly, yearly
  billing_period: number;

  @IsNotEmpty()
  @IsNumber()
  @IsInt()
  released_credits: number;

  @IsOptional()
  @IsNumber()
  @IsInt()
  credits_released_trial_period?: number;

  @IsOptional()
  @IsNumber()
  @IsInt()
  trial_days?: number;

  @IsOptional()
  @IsNumber()
  @IsInt()
  guest_limit?: number;
}
```

### 5.3 Lógica do createPlan no service

```typescript
async createPlan(dto: CreatePlanDTO): Promise<ServiceResponse<Plan | HTTPErrorResponse>> {
  // 1. Verificar se slug já existe
  const existing = await this.planRepository.findBySlug(dto.slug);
  if (existing) {
    return httpR({ status: 409, error: { error: 'SLUG_ALREADY_EXISTS', message: 'Slug já em uso.' } });
  }

  // 2. Criar produto no Stripe
  const stripeProduct = await this.stripeProvider.createProduct({
    name: dto.plan_name,
    description: dto.description,
    metadata: { slug: dto.slug },
  });

  // 3. Mapear billing_period para interval do Stripe
  const intervalMap = {
    1: { interval: 'week' as const, intervalCount: 1 },
    2: { interval: 'month' as const, intervalCount: 1 },
    3: { interval: 'month' as const, intervalCount: 3 },
    4: { interval: 'year' as const, intervalCount: 1 },
  };
  const { interval, intervalCount } = intervalMap[dto.billing_period];

  // 4. Criar preço recorrente no Stripe
  const stripePrice = await this.stripeProvider.createPrice({
    productId: stripeProduct.id,
    unitAmount: dto.unit_amount,
    currency: dto.currency,
    interval,
    intervalCount,
    metadata: { slug: dto.slug, type: 'recurring' },
  });

  // 5. Criar preço de trial (se configurado)
  let trialPriceId: string | null = null;
  if (dto.trial_days && dto.credits_released_trial_period) {
    const trialPrice = await this.stripeProvider.createPrice({
      productId: stripeProduct.id,
      unitAmount: 0, // trial gratuito
      currency: dto.currency,
      interval: 'day',
      intervalCount: dto.trial_days,
      metadata: { slug: dto.slug, type: 'trial' },
    });
    trialPriceId = trialPrice.id;
  }

  // 6. Salvar no banco
  const plan = await this.planRepository.create({
    slug: dto.slug,
    plan_name: dto.plan_name,
    stripe_product_id: stripeProduct.id,
    external_plan_id: stripePrice.id,
    external_plan_trial_period_id: trialPriceId,
    billing_period: dto.billing_period,
    unit_amount: dto.unit_amount,
    currency: dto.currency,
    released_credits: dto.released_credits,
    credits_released_trial_period: dto.credits_released_trial_period ?? 0,
    trial_days: dto.trial_days ?? 7,
    guest_limit: dto.guest_limit ?? 0,
    active: true,
  });

  return httpR({ status: 201, data: plan });
}
```

### 5.4 Lógica do archivePlan

```typescript
async archivePlan(planId: number): Promise<ServiceResponse<any | HTTPErrorResponse>> {
  const plan = await this.planRepository.findById(planId);
  if (!plan) {
    return httpR({ status: 404, error: { error: 'PLAN_NOT_FOUND', message: 'Plano não encontrado.' } });
  }

  // Arquivar no Stripe (não deleta — preserva histórico de cobranças)
  await this.stripeProvider.archiveProduct(plan.stripe_product_id);
  await this.stripeProvider.archivePrice(plan.external_plan_id);
  if (plan.external_plan_trial_period_id) {
    await this.stripeProvider.archivePrice(plan.external_plan_trial_period_id);
  }

  // Marcar como inativo no banco
  await this.planRepository.update(planId, { active: false });

  return httpR({ status: 200, data: { archived: true } });
}
```

---

## 6. Webhook próprio (parte do MVP)

O webhook é o coração do sistema. Sem ele, a liberação de planos depende de chamadas externas não autenticadas.

### 6.1 Endpoint

```typescript
// plan.controller.ts
@Post('/webhook/stripe')
async stripeWebhook(
  @Req() req: Request & { rawBody: Buffer },
  @Res() res: Response,
  @Headers('stripe-signature') signature: string,
) {
  if (!signature) {
    return res.status(400).json({ error: 'Missing stripe-signature' });
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

  // Responde 200 imediatamente — processamento é assíncrono
  res.status(200).json({ received: true });

  // Processa em background (não bloqueia a resposta)
  this.planService.processStripeEvent(event).catch(console.error);
}
```

### 6.2 Processamento de eventos

```typescript
// plan.service.ts
async processStripeEvent(event: Stripe.Event): Promise<void> {
  // Idempotência — verificar se já processou
  const alreadyProcessed = await this.webhookEventRepo.existsByStripeEventId(event.id);
  if (alreadyProcessed) return;

  // Registrar o evento
  await this.webhookEventRepo.create({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: event as unknown as Record<string, unknown>,
  });

  switch (event.type) {
    case 'checkout.session.completed':
      await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'customer.subscription.deleted':
      await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case 'invoice.paid':
      await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;
    case 'invoice.payment_failed':
      await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
  }

  // Marcar como processado
  await this.webhookEventRepo.markAsProcessed(event.id);
}

private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = parseInt(session.metadata?.user_id ?? '0');
  const planSlug = session.metadata?.plan_slug;
  const subscriptionId = session.subscription as string;
  const inTrialPeriod = session.metadata?.in_trial_period === 'true';

  if (!userId || !planSlug || !subscriptionId) return;

  await this.updatePlan({ user_id: userId, external_id: planSlug, subscription_id: subscriptionId, in_trial_period: inTrialPeriod });
}

private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const userId = parseInt(subscription.metadata?.user_id ?? '0');
  const planId = subscription.metadata?.external_plan_id;
  if (!userId || !planId) return;

  await this.revokePlan({ user_id: userId, external_plan_id: planId });
}

private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  // Renovação mensal — criar novos créditos e novo log
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  // Buscar o PlanReleaseLog mais recente para essa subscription
  const lastLog = await this.planReleaseLogRepository.findBySubscriptionId(subscriptionId);
  if (!lastLog) return;

  // Verificar idempotência pelo invoice_id
  const invoiceId = invoice.id;
  const alreadyLogged = await this.planReleaseLogRepository.findByInvoiceId(invoiceId);
  if (alreadyLogged) return;

  // Criar novos créditos para o período renovado
  await this.updatePlan({
    user_id: lastLog.user_id,
    external_id: lastLog.external_plan_id,
    subscription_id: subscriptionId,
    invoice_id: invoiceId,
    in_trial_period: false,
  });
}

private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  const lastLog = await this.planReleaseLogRepository.findBySubscriptionId(subscriptionId);
  if (!lastLog) return;

  // Marcar organização como inadimplente
  await this.organizationRepository.update(lastLog.organization_id, {
    subscription_status: 'past_due',
  });
}
```

### 6.3 Configuração do raw body no main.ts

```typescript
// main.ts — ANTES do app.useGlobalPipes
import { json } from 'express';

app.use(
  '/plan/webhook/stripe',
  json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
```

---

## 7. Tabela de webhook events (nova migração)

```sql
CREATE TABLE stripe_webhook_events (
  id               SERIAL PRIMARY KEY,
  stripe_event_id  VARCHAR(255) UNIQUE NOT NULL,
  event_type       VARCHAR(100) NOT NULL,
  payload          JSONB NOT NULL,
  processed        BOOLEAN DEFAULT false,
  error_message    TEXT,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_processed ON stripe_webhook_events (processed);
CREATE INDEX idx_webhook_events_event_type ON stripe_webhook_events (event_type);
```

No Prisma:
```prisma
model StripeWebhookEvent {
  id              Int      @id @default(autoincrement())
  stripe_event_id String   @unique @db.VarChar(255)
  event_type      String   @db.VarChar(100)
  payload         Json
  processed       Boolean  @default(false)
  error_message   String?  @db.Text
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
}
```

---

## 8. Variáveis de ambiente necessárias

```env
# Já existentes
STRIPE_SECRET_KEY=sk_live_...
FRONTEND_URL=https://app.seudominio.com

# Novas
STRIPE_WEBHOOK_SECRET=whsec_...   # obtido no Stripe Dashboard ao criar o webhook endpoint
```

No Stripe Dashboard, configurar o webhook endpoint para:
```
https://api.seudominio.com/plan/webhook/stripe
```

Eventos a escutar:
- `checkout.session.completed`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

---

## 9. Resumo do MVP — o que implementar

### Fase 1 — Segurança (urgente)
- [ ] Endpoint de webhook com validação de assinatura (`/plan/webhook/stripe`)
- [ ] Tabela `StripeWebhookEvent` para idempotência
- [ ] Remover `user_id` do body das rotas de webhook — ler do metadata do evento
- [ ] Configurar raw body no `main.ts`

### Fase 2 — Controle de produtos
- [ ] Adicionar `stripe_product_id`, `unit_amount`, `currency`, `active` no modelo `Plan`
- [ ] Métodos `createProduct`, `createPrice`, `archiveProduct`, `archivePrice` no `StripeProvider`
- [ ] Endpoints admin: `POST /plan/admin/create`, `DELETE /plan/admin/:id`, `GET /plan/admin/list`
- [ ] Endpoint público: `GET /plan/list` (só planos ativos)

### Fase 3 — Consistência de dados
- [ ] Adicionar `stripe_customer_id` e `subscription_status` na `Organization`
- [ ] Corrigir UNIQUE no `PlanReleaseLog` (remover de `subscription_id`, adicionar `invoice_id`)
- [ ] Tratar `invoice.paid` para renovações automáticas
- [ ] Tratar `invoice.payment_failed` para marcar inadimplência
- [ ] Tratar `customer.subscription.deleted` para revogar plano automaticamente

---

## 10. O que NÃO fazer no MVP

- **Não deletar produtos/preços no Stripe** — sempre arquivar. Deletar quebra o histórico de cobranças.
- **Não mudar o `external_plan_id` de um plano existente** — subscriptions ativas referenciam esse price_id.
- **Não processar webhooks de forma síncrona** — responder 200 imediatamente e processar em background.
- **Não logar o payload completo do webhook em produção** — pode conter dados sensíveis. Logar apenas `event_type` e `stripe_event_id`.

---

*Documento gerado em 24/04/2026 — baseado na análise do código atual e nas melhores práticas do Stripe.*
