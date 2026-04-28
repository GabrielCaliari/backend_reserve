# Integração do Dashboard — Gerenciamento de Planos

> Guia completo para o dashboard consumir a API de planos e repassar os dados para o frontend.
> Todos os endpoints exigem autenticação via `AdminJwtGuard` (exceto `GET /api/plans/list`, que usa `UserJwtGuard`).

---

## 1. Visão geral do fluxo

```
Dashboard (admin)
    │
    ├── GET  /api/plans/admin/list     → lista todos os planos (ativos + inativos)
    ├── POST /api/plans/admin/create   → cria produto+preço no Stripe e persiste localmente
    ├── PATCH /api/plans/admin/:id     → atualiza metadados locais (nome, créditos, limites)
    └── DELETE /api/plans/admin/:id   → arquiva no Stripe + marca inativo localmente

Frontend (usuário final)
    └── GET /api/plans/list            → lista apenas planos ativos
```

O backend é a **fonte de verdade**. O dashboard nunca acessa o Stripe diretamente — tudo passa pela API.

---

## 2. Objeto de resposta — `StripePlan`

Todos os endpoints retornam objetos neste formato:

```json
{
  "id": "cm9abc123xyz",
  "slug": "basico",
  "plan_name": "Plano Básico",
  "description": "Ideal para pequenas empresas",

  "stripe_product_id": "prod_ABC123",
  "stripe_price_id": "price_XYZ789",
  "stripe_trial_price_id": "price_TRIAL456",

  "billing_interval": 2,
  "unit_amount": 9990,
  "currency": "brl",

  "released_credits": 100,
  "credits_released_trial_period": 20,
  "guest_limit": 3,
  "trial_days": 7,

  "active": true,
  "created_at": "2026-04-27T00:00:00.000Z",
  "updated_at": "2026-04-27T00:00:00.000Z"
}
```

### Referência de campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | `string` | ID interno (cuid) — use para PATCH e DELETE |
| `slug` | `string` | Identificador legível, único. Ex: `"basico"` |
| `plan_name` | `string` | Nome exibido ao usuário |
| `description` | `string \| null` | Descrição opcional |
| `stripe_product_id` | `string` | ID do produto no Stripe (`prod_...`) |
| `stripe_price_id` | `string` | ID do preço recorrente no Stripe (`price_...`) — use para criar checkout |
| `stripe_trial_price_id` | `string \| null` | ID do preço de trial gratuito, se configurado |
| `billing_interval` | `1 \| 2 \| 3 \| 4` | Periodicidade de cobrança (ver tabela abaixo) |
| `unit_amount` | `number` | Valor **em centavos**. Ex: `9990` = R$ 99,90 |
| `currency` | `"brl" \| "usd"` | Moeda |
| `released_credits` | `number` | Créditos liberados por ciclo de cobrança |
| `credits_released_trial_period` | `number` | Créditos liberados durante o trial |
| `guest_limit` | `number` | Máximo de usuários convidados |
| `trial_days` | `number` | Dias de trial (0 = sem trial) |
| `active` | `boolean` | `false` = plano arquivado, não aparece para usuários |
| `created_at` | `ISO 8601` | Data de criação |
| `updated_at` | `ISO 8601` | Última atualização |

### Tabela de `billing_interval`

| Valor | Periodicidade | Intervalo Stripe |
|-------|--------------|-----------------|
| `1` | Semanal | `week × 1` |
| `2` | Mensal | `month × 1` |
| `3` | Trimestral | `month × 3` |
| `4` | Anual | `year × 1` |

---

## 3. Endpoints do dashboard (admin)

### 3.1 Listar todos os planos

```
GET /api/plans/admin/list
Authorization: Bearer <admin_token>
```

**Resposta:** array de `StripePlan` — inclui planos inativos (arquivados).

Use o campo `active` para diferenciar visualmente no dashboard:
- `active: true` → exibir normalmente
- `active: false` → exibir com badge "Arquivado" / linha esmaecida

```json
[
  { "id": "cm9abc", "slug": "basico", "active": true, ... },
  { "id": "cm9def", "slug": "antigo", "active": false, ... }
]
```

---

### 3.2 Criar um plano

```
POST /api/plans/admin/create
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Body:**

```json
{
  "slug": "profissional",
  "plan_name": "Plano Profissional",
  "description": "Para equipes em crescimento",
  "unit_amount": 19990,
  "currency": "brl",
  "billing_interval": 2,
  "released_credits": 300,
  "credits_released_trial_period": 50,
  "trial_days": 7,
  "guest_limit": 5
}
```

**Campos obrigatórios:** `slug`, `plan_name`, `unit_amount`, `currency`, `billing_interval`, `released_credits`

**Campos opcionais:** `description`, `credits_released_trial_period`, `trial_days`, `guest_limit`

**Regras de validação:**
- `slug`: apenas letras minúsculas, números e hífens (`/^[a-z0-9-]+$/`), máx. 100 chars
- `unit_amount`: inteiro em centavos, mínimo 0
- `billing_interval`: apenas `1`, `2`, `3` ou `4`
- `currency`: apenas `"brl"` ou `"usd"`
- Trial só é criado no Stripe se `trial_days > 0` **e** `credits_released_trial_period > 0`

**Resposta de sucesso:** `201 Created` com o objeto `StripePlan` criado.

**Erros possíveis:**

| Status | Código | Causa |
|--------|--------|-------|
| `409` | Conflict | `slug` já existe |
| `400` | Bad Request | `billing_interval` inválido ou erro na API do Stripe |

---

### 3.3 Atualizar metadados de um plano

```
PATCH /api/plans/admin/:id
Authorization: Bearer <admin_token>
Content-Type: application/json
```

> **Importante:** apenas metadados locais são atualizáveis. Os IDs do Stripe (`stripe_product_id`, `stripe_price_id`) são **imutáveis** — alterá-los quebraria assinaturas ativas que referenciam esses price IDs.

**Body (todos opcionais):**

```json
{
  "plan_name": "Plano Profissional Plus",
  "description": "Descrição atualizada",
  "released_credits": 350,
  "credits_released_trial_period": 60,
  "guest_limit": 8,
  "trial_days": 14
}
```

**Resposta de sucesso:** `200 OK` com o objeto `StripePlan` atualizado.

**Erros possíveis:**

| Status | Causa |
|--------|-------|
| `404` | Plano não encontrado |

---

### 3.4 Arquivar um plano

```
DELETE /api/plans/admin/:id?tenant_id=<tenant_id>
Authorization: Bearer <admin_token>
```

> Não deleta — arquiva. O produto e os preços são desativados no Stripe (`active: false`), e o plano é marcado como inativo localmente. O histórico de cobranças é preservado.

**Query parameters:**
- `tenant_id` (obrigatório) — ID do tenant para resolver a chave Stripe

**Resposta de sucesso:** `200 OK`

```json
{ "archived": true }
```

**Erros possíveis:**

| Status | Causa |
|--------|-------|
| `400` | `tenant_id` não fornecido ou chave Stripe não configurada |
| `404` | Plano não encontrado |

---

## 4. Endpoint público (frontend do usuário)

```
GET /api/plans/list
Authorization: Bearer <user_token>
```

Retorna apenas planos com `active: true`. Use este endpoint para renderizar a página de pricing para o usuário final.

**Resposta:** array de `StripePlan` (somente ativos, ordenados por `created_at ASC`).

---

## 5. Como o dashboard deve processar os dados

### 5.1 Conversão de `unit_amount` para exibição

O backend sempre trafega o valor **em centavos**. O dashboard deve converter antes de exibir:

```typescript
// centavos → reais formatados
function formatPrice(unitAmount: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(unitAmount / 100);
}

// Exemplos:
formatPrice(9990, 'brl')   // "R$ 99,90"
formatPrice(19990, 'brl')  // "R$ 199,90"
formatPrice(0, 'brl')      // "R$ 0,00"
```

Ao **enviar** para o backend (criação), converter de volta:

```typescript
// reais → centavos (para o body do POST)
const unitAmount = Math.round(parseFloat(priceInput) * 100);
// Ex: "99.90" → 9990
```

### 5.2 Conversão de `billing_interval` para texto

```typescript
const BILLING_INTERVAL_LABELS: Record<number, string> = {
  1: 'Semanal',
  2: 'Mensal',
  3: 'Trimestral',
  4: 'Anual',
};

const BILLING_INTERVAL_STRIPE: Record<number, string> = {
  1: 'week',
  2: 'month',
  3: 'month × 3',
  4: 'year',
};

// Uso:
BILLING_INTERVAL_LABELS[plan.billing_interval] // "Mensal"
```

### 5.3 Verificar se o plano tem trial

```typescript
function hasTrial(plan: StripePlan): boolean {
  return plan.trial_days > 0 && plan.credits_released_trial_period > 0;
}

// Texto para exibição:
function trialLabel(plan: StripePlan): string | null {
  if (!hasTrial(plan)) return null;
  return `${plan.trial_days} dias grátis (${plan.credits_released_trial_period} créditos)`;
}
```

### 5.4 Diferenciar planos ativos e arquivados (lista admin)

```typescript
interface StripePlan {
  id: string;
  slug: string;
  plan_name: string;
  description?: string;
  stripe_product_id: string;
  stripe_price_id: string;
  stripe_trial_price_id?: string;
  billing_interval: 1 | 2 | 3 | 4;
  unit_amount: number;
  currency: string;
  released_credits: number;
  credits_released_trial_period: number;
  guest_limit: number;
  trial_days: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Separar para renderização
const activePlans = plans.filter(p => p.active);
const archivedPlans = plans.filter(p => !p.active);
```

---

## 6. Fluxo completo — criar um plano pelo dashboard

```
1. Admin preenche o formulário no dashboard
   ├── Nome, descrição, slug
   ├── Valor (em reais — o dashboard converte para centavos)
   ├── Moeda (brl / usd)
   ├── Periodicidade (semanal / mensal / trimestral / anual)
   ├── Créditos por ciclo
   └── Trial (dias + créditos do trial)

2. Dashboard envia POST /api/plans/admin/create
   └── unit_amount já convertido para centavos

3. Backend:
   ├── Valida slug único
   ├── Cria Product no Stripe
   ├── Cria Price recorrente no Stripe
   ├── (se trial configurado) Cria Price de trial gratuito no Stripe
   └── Persiste localmente na tabela stripe_plans

4. Backend retorna o objeto StripePlan com os IDs do Stripe preenchidos

5. Dashboard atualiza a lista de planos
```

---

## 7. Fluxo completo — arquivar um plano

```
1. Admin clica em "Arquivar" no dashboard

2. Dashboard exibe confirmação:
   "Planos arquivados não aparecem para novos usuários.
    Assinantes existentes não são afetados."

3. Dashboard envia DELETE /api/plans/admin/:id?tenant_id=<tenant_id>

4. Backend:
   ├── Busca a chave Stripe do tenant
   ├── Arquiva o Product no Stripe (active: false)
   ├── Arquiva o Price recorrente no Stripe (active: false)
   ├── (se existir) Arquiva o Price de trial no Stripe (active: false)
   └── Marca active: false localmente

5. Backend retorna { archived: true }

6. Dashboard move o plano para a seção "Arquivados"
```

---

## 8. Repassando dados para o frontend do usuário

O frontend do usuário consome `GET /api/plans/list` (com token de usuário). O dashboard não precisa intermediar essa chamada — o frontend chama diretamente.

### ⚠️ CRÍTICO: Usar `stripe_price_id`, NÃO `stripe_product_id`

Ao criar um checkout de subscription, o frontend **DEVE** usar o campo `stripe_price_id` retornado pelo plano:

```typescript
// ✅ CORRETO
const checkoutBody = {
  tenant_id: currentTenant.id,
  price_id: plan.stripe_price_id,  // price_xxx — CORRETO
  success_url: '...',
  cancel_url: '...',
};

// ❌ ERRADO — vai gerar erro "No such price: 'prod_xxx'"
const checkoutBody = {
  tenant_id: currentTenant.id,
  price_id: plan.stripe_product_id,  // prod_xxx — ERRADO!
  success_url: '...',
  cancel_url: '...',
};
```

O Stripe espera um `price_id` (começa com `price_`) no checkout, **não** um `product_id` (começa com `prod_`).

### Mapeamento recomendado

Se o dashboard precisar **pré-processar** os dados antes de repassar (ex: em um BFF), o mapeamento recomendado é:

```typescript
function mapPlanToFrontend(plan: StripePlan) {
  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.plan_name,
    description: plan.description ?? null,
    price: {
      amount: plan.unit_amount / 100,           // centavos → decimal
      formatted: formatPrice(plan.unit_amount, plan.currency),
      currency: plan.currency.toUpperCase(),
      interval: BILLING_INTERVAL_LABELS[plan.billing_interval],
    },
    trial: hasTrial(plan)
      ? {
          days: plan.trial_days,
          credits: plan.credits_released_trial_period,
          label: `${plan.trial_days} dias grátis`,
          stripePriceId: plan.stripe_trial_price_id,
        }
      : null,
    features: {
      credits: plan.released_credits,
      guestLimit: plan.guest_limit,
    },
    // Repassar o stripe_price_id para o frontend criar o checkout
    stripePriceId: plan.stripe_price_id,
  };
}
```

> O `stripe_price_id` deve ser repassado ao frontend para que ele possa iniciar o checkout via `POST /api/subscriptions/checkout` com o `priceId` correto.

---

## 9. Erros comuns e como tratar

| Situação | Status | O que fazer no dashboard |
|----------|--------|--------------------------|
| Slug duplicado | `409` | Exibir "Este slug já está em uso. Escolha outro." |
| Plano não encontrado | `404` | Recarregar a lista (pode ter sido arquivado por outro admin) |
| Erro no Stripe | `400` | Exibir a mensagem de erro retornada no campo `message` |
| Token expirado | `401` | Redirecionar para login |
| Sem permissão | `403` | Exibir "Acesso negado" |

Estrutura de erro padrão da API:

```json
{
  "statusCode": 409,
  "message": "A plan with slug \"basico\" already exists.",
  "error": "Conflict"
}
```

---

## 10. Variáveis de ambiente necessárias

O backend precisa de `STRIPE_SECRET_KEY` configurado para que os endpoints de criação e arquivamento funcionem. Sem ela, qualquer chamada que toque o Stripe retorna `500`.

```env
STRIPE_SECRET_KEY=sk_live_...   # ou sk_test_... em desenvolvimento
```

Verifique se está configurado antes de habilitar a aba de planos no dashboard.

---

*Gerado em 27/04/2026 — baseado na implementação do módulo `zarp-subscriptions` (StripePlansController, CreateStripePlanUseCase, ArchiveStripePlanUseCase, ListStripePlansUseCase, UpdateStripePlanUseCase).*
