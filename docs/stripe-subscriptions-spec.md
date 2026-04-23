# Especificação: Stripe Subscriptions para ZARP

## Objetivo

Implementar integração com Stripe para gerenciar assinaturas recorrentes (subscriptions) vinculadas a **Tenants**, permitindo que o frontend crie checkout sessions e o backend processe webhooks automaticamente.

## Escopo Inicial (MVP)

### O que SERÁ implementado:

- ✅ Webhook handler para processar eventos do Stripe
- ✅ Endpoint para criar checkout session (subscription)
- ✅ Endpoint para buscar subscription ativa do tenant
- ✅ Endpoint para cancelar subscription
- ✅ Tabelas no banco para armazenar subscriptions e eventos
- ✅ Integração com modelo `Tenant` existente

### O que NÃO será implementado agora:

- ❌ Pacotes B2C (créditos avulsos)
- ❌ Upgrade/Downgrade de planos
- ❌ Múltiplas subscriptions por tenant
- ❌ Cupons de desconto
- ❌ Histórico de faturas (invoices)
- ❌ Notificações por email
- ❌ Controle de limite de uso

## Arquitetura

### Entidades Principais

| Entidade | Responsabilidade |
|----------|------------------|
| `StripeSubscription` | Armazena dados da subscription do Stripe |
| `StripeWebhookEvent` | Log de eventos recebidos do Stripe |
| `Tenant` | Entidade existente que terá subscription vinculada |

### Fluxo de Subscription

```
Frontend → POST /api/subscriptions/checkout
         ← checkout_url (Stripe)
         
Usuário paga no Stripe
         
Stripe → POST /api/webhooks/stripe
Backend processa evento
Backend atualiza StripeSubscription
```

## Schema do Banco de Dados

### Tabela: `StripeSubscription`

```prisma
model StripeSubscription {
  id                     String    @id @default(cuid()) @db.VarChar(25)
  tenant_id              String    @unique @db.VarChar(25)
  
  // IDs do Stripe
  stripe_subscription_id String    @unique
  stripe_customer_id     String
  stripe_price_id        String
  
  // Status
  status                 String    // active, canceled, past_due, trialing, etc.
  
  // Datas
  current_period_start   DateTime
  current_period_end     DateTime
  trial_start            DateTime?
  trial_end              DateTime?
  canceled_at            DateTime?
  cancel_at_period_end   Boolean   @default(false)
  
  // Financeiro
  amount                 Int       // Valor em centavos
  currency               String    @default("brl")
  interval               String    // month, year
  
  // Metadata
  metadata               Json?
  created_at             DateTime  @default(now())
  updated_at             DateTime  @updatedAt
  
  Tenant                 Tenant    @relation(fields: [tenant_id], references: [id])
  
  @@index([stripe_subscription_id])
  @@index([stripe_customer_id])
  @@index([tenant_id, status])
}
```

### Tabela: `StripeWebhookEvent`

```prisma
model StripeWebhookEvent {
  id              String    @id @default(cuid()) @db.VarChar(25)
  stripe_event_id String    @unique
  event_type      String
  payload         Json
  processed       Boolean   @default(false)
  error_message   String?   @db.Text
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt
  
  @@index([event_type, processed])
  @@index([created_at])
}
```

## Endpoints da API

### 1. Criar Checkout Session

**Endpoint:** `POST /api/subscriptions/checkout`

**Auth:** JWT (Admin ou User com permissão)

**Request Body:**
```json
{
  "tenant_id": "cuid",
  "price_id": "price_xxx", // ID do preço no Stripe
  "success_url": "https://app.zarp.com/success",
  "cancel_url": "https://app.zarp.com/cancel"
}
```

**Response:**
```json
{
  "checkout_url": "https://checkout.stripe.com/...",
  "session_id": "cs_xxx"
}
```

### 2. Buscar Subscription Ativa

**Endpoint:** `GET /api/subscriptions/tenant/:tenantId`

**Auth:** JWT

**Response:**
```json
{
  "id": "cuid",
  "tenant_id": "cuid",
  "status": "active",
  "current_period_start": "2024-01-01T00:00:00Z",
  "current_period_end": "2024-02-01T00:00:00Z",
  "amount": 4990,
  "currency": "brl",
  "interval": "month",
  "cancel_at_period_end": false
}
```

### 3. Cancelar Subscription

**Endpoint:** `POST /api/subscriptions/:id/cancel`

**Auth:** JWT

**Request Body:**
```json
{
  "cancel_immediately": false // Se true, cancela agora. Se false, cancela no fim do período
}
```

**Response:**
```json
{
  "message": "Subscription cancelada com sucesso",
  "cancel_at_period_end": true,
  "access_until": "2024-02-01T00:00:00Z"
}
```

### 4. Webhook do Stripe

**Endpoint:** `POST /api/webhooks/stripe`

**Auth:** Stripe Signature Validation

**Eventos Processados:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

## Variáveis de Ambiente

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# URLs
FRONTEND_URL=https://app.zarp.com
```

## Decisões Técnicas

### 1. Vinculação com Tenant

- Cada `Tenant` pode ter **apenas 1 subscription ativa**
- Constraint: `UNIQUE(tenant_id)` na tabela `StripeSubscription`
- Quando subscription é cancelada, o registro permanece com `status = 'canceled'`

### 2. Preços no Stripe

- Os preços (prices) são criados **manualmente no Stripe Dashboard**
- O backend recebe o `price_id` do frontend
- Não há tabela de "planos" no backend (simplificação do MVP)

### 3. Trial Period

- Se o preço no Stripe tiver trial configurado, será aplicado automaticamente
- O backend apenas armazena as datas `trial_start` e `trial_end`

### 4. Webhook Idempotência

- Cada evento do Stripe tem um `stripe_event_id` único
- Constraint `UNIQUE(stripe_event_id)` previne processamento duplicado
- Se evento já existe, retorna 200 OK sem reprocessar

### 5. Segurança do Webhook

- Validação obrigatória da assinatura do Stripe usando `stripe.webhooks.constructEvent()`
- Rejeita requisições sem assinatura válida

## Próximos Passos (Pós-MVP)

1. Adicionar endpoint de upgrade/downgrade
2. Implementar controle de features por plano
3. Adicionar notificações por email
4. Criar dashboard de métricas (MRR, churn)
5. Implementar pacotes B2C (créditos)

## Referências

- [Stripe Subscriptions API](https://stripe.com/docs/api/subscriptions)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
