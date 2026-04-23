# Zarp Subscriptions Module

Módulo de integração com Stripe para gerenciamento de assinaturas recorrentes vinculadas a Tenants.

## Arquitetura

Este módulo segue a arquitetura DDD (Domain-Driven Design) do projeto ZARP:

```
zarp-subscriptions/
├── domain/                    # Camada de domínio (Pure TypeScript)
│   ├── entities/              # Entidades de negócio
│   ├── enums/                 # Enums do domínio
│   └── interfaces/            # Contratos (ports)
├── application/               # Camada de aplicação
│   ├── use-cases/             # Casos de uso
│   └── dtos/                  # Data Transfer Objects
└── infrastructure/            # Camada de infraestrutura (NestJS)
    ├── controllers/           # Endpoints HTTP
    ├── repositories/          # Implementações Prisma
    └── providers/             # Integrações externas (Stripe SDK)
```

## Funcionalidades

### ✅ Implementado

- **Criar Checkout Session**: Gera URL de pagamento do Stripe
- **Buscar Subscription**: Retorna subscription ativa de um tenant
- **Cancelar Subscription**: Cancela imediatamente ou no fim do período
- **Webhook Handler**: Processa eventos do Stripe automaticamente
- **Idempotência**: Previne processamento duplicado de eventos
- **Validação de Assinatura**: Segurança do webhook com Stripe signature

### Eventos do Stripe Processados

- `customer.subscription.created` - Cria subscription no banco
- `customer.subscription.updated` - Atualiza dados da subscription
- `customer.subscription.deleted` - Marca subscription como cancelada
- `invoice.paid` - Ativa subscription após pagamento
- `invoice.payment_failed` - Marca subscription como `past_due`

## Endpoints da API

### 1. Criar Checkout Session

```http
POST /api/subscriptions/checkout
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "tenantId": "cuid",
  "priceId": "price_xxx",
  "successUrl": "https://app.zarp.com/success",
  "cancelUrl": "https://app.zarp.com/cancel",
  "trialPeriodDays": 7
}
```

**Response:**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_test_..."
}
```

### 2. Buscar Subscription do Tenant

```http
GET /api/subscriptions/tenant/:tenantId
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "id": "cuid",
  "tenantId": "cuid",
  "status": "active",
  "currentPeriodStart": "2024-01-01T00:00:00Z",
  "currentPeriodEnd": "2024-02-01T00:00:00Z",
  "amount": 4990,
  "formattedAmount": 49.90,
  "currency": "brl",
  "interval": "month",
  "daysRemaining": 15,
  "isActive": true,
  "isInTrial": false
}
```

### 3. Cancelar Subscription

```http
POST /api/subscriptions/:id/cancel
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "cancelImmediately": false
}
```

**Response:**
```json
{
  "message": "Subscription will be canceled at the end of the current period",
  "cancelAtPeriodEnd": true,
  "accessUntil": "2024-02-01T00:00:00Z"
}
```

### 4. Webhook do Stripe

```http
POST /api/webhooks/stripe
Stripe-Signature: {signature}
Content-Type: application/json

{...stripe_event_payload...}
```

**Response:**
```json
{
  "received": true
}
```

## Configuração

### Variáveis de Ambiente

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# URLs
FRONTEND_URL=https://app.zarp.com
```

### Configurar Webhook no Stripe Dashboard

1. Acesse [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Clique em "Add endpoint"
3. URL: `https://api.zarp.com/api/webhooks/stripe`
4. Selecione os eventos:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copie o "Signing secret" e adicione em `STRIPE_WEBHOOK_SECRET`

### Configurar Raw Body no main.ts

O webhook do Stripe requer acesso ao raw body da requisição. Adicione no `main.ts`:

```typescript
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Raw body for Stripe webhook
  app.use(
    '/api/webhooks/stripe',
    json({
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  
  app.useGlobalPipes(new ValidationPipe());
  // ... rest of bootstrap
}
```

## Banco de Dados

### Migrations

Execute a migration para criar as tabelas:

```bash
pnpm exec prisma migrate dev --name add_stripe_subscriptions
```

### Tabelas Criadas

- `stripe_subscriptions` - Armazena subscriptions vinculadas a tenants
- `stripe_webhook_events` - Log de eventos recebidos do Stripe

## Testes

### Testar Webhook Localmente

Use o Stripe CLI para encaminhar eventos:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copie o webhook secret exibido e adicione em `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

Trigger eventos de teste:

```bash
stripe trigger customer.subscription.created
stripe trigger invoice.paid
stripe trigger customer.subscription.deleted
```

## Fluxo Completo

```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as Backend
    participant S as Stripe
    
    F->>B: POST /subscriptions/checkout
    B->>S: Create checkout session
    S-->>B: Return checkout URL
    B-->>F: Return checkout URL
    F->>S: Redirect user to Stripe
    
    User pays on Stripe
    
    S->>B: POST /webhooks/stripe (subscription.created)
    B->>B: Create subscription in DB
    B-->>S: 200 OK
    
    S->>B: POST /webhooks/stripe (invoice.paid)
    B->>B: Update subscription status to active
    B-->>S: 200 OK
    
    S-->>F: Redirect to success_url
```

## Regras de Negócio

1. **Um tenant = Uma subscription**: Constraint `UNIQUE(tenant_id)`
2. **Idempotência**: Eventos duplicados são ignorados via `stripe_event_id`
3. **Metadata obrigatória**: `tenantId` deve estar nos metadados da subscription
4. **Cancelamento**: Pode ser imediato ou no fim do período
5. **Trial**: Configurado no preço do Stripe, não no backend

## Próximos Passos

- [ ] Adicionar endpoint de upgrade/downgrade
- [ ] Implementar notificações por email
- [ ] Criar dashboard de métricas (MRR, churn)
- [ ] Adicionar suporte a múltiplas subscriptions por tenant
- [ ] Implementar cupons de desconto
- [ ] Adicionar histórico de faturas (invoices)

## Referências

- [Stripe Subscriptions API](https://stripe.com/docs/api/subscriptions)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
