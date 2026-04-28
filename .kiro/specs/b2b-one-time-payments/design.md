# Design: B2B One-Time Payments

## Architecture Overview

Sistema de pagamentos únicos seguindo arquitetura DDD com bounded context `zarp-b2b-payments`.

## Module Structure

```
src/modules/zarp-b2b-payments/
├── domain/
│   ├── entities/
│   │   ├── b2b-product.entity.ts
│   │   └── b2b-purchase.entity.ts
│   ├── enums/
│   │   └── purchase-status.enum.ts
│   └── interfaces/
│       ├── b2b-product.repository.interface.ts
│       ├── b2b-purchase.repository.interface.ts
│       └── b2b-stripe-webhook-event.repository.interface.ts
├── application/
│   ├── use-cases/
│   │   ├── create-payment-link.use-case.ts
│   │   ├── list-purchases.use-case.ts
│   │   ├── get-purchase.use-case.ts
│   │   ├── list-products.use-case.ts
│   │   ├── get-metrics.use-case.ts
│   │   └── process-b2b-webhook.use-case.ts
│   └── dtos/
│       ├── create-payment-link.dto.ts
│       ├── purchase-response.dto.ts
│       ├── product-response.dto.ts
│       ├── metrics-response.dto.ts
│       └── list-purchases-query.dto.ts
└── infrastructure/
    ├── controllers/
    │   ├── b2b-payments.controller.ts
    │   └── b2b-webhook.controller.ts
    ├── repositories/
    │   ├── prisma-b2b-product.repository.ts
    │   ├── prisma-b2b-purchase.repository.ts
    │   └── prisma-b2b-stripe-webhook-event.repository.ts
    └── zarp-b2b-payments.module.ts
```

## Database Schema

### Prisma Models

```prisma
model B2BProduct {
  id                String   @id @default(uuid()) @db.Uuid
  stripe_product_id String   @unique @db.VarChar(100)
  stripe_price_id   String   @unique @db.VarChar(100)
  name              String   @db.VarChar(255)
  description       String?  @db.Text
  price             Int      // Centavos
  currency          String   @default("brl") @db.VarChar(3)
  active            Boolean  @default(true)
  created_at        DateTime @default(now()) @db.Timestamptz
  updated_at        DateTime @updatedAt @db.Timestamptz

  purchases         B2BPurchase[]

  @@map("b2b_products")
}

model B2BPurchase {
  id                      String    @id @default(uuid()) @db.Uuid
  user_id                 String?   @db.Uuid
  product_id              String    @db.Uuid
  stripe_checkout_id      String?   @unique @db.VarChar(200)
  stripe_payment_intent   String?   @unique @db.VarChar(200)
  
  checkout_started_at     DateTime? @db.Timestamptz
  checkout_completed_at   DateTime? @db.Timestamptz
  checkout_abandoned_at   DateTime? @db.Timestamptz
  
  status                  String    @db.VarChar(20) // pending, completed, abandoned, refunded
  amount                  Int       // Centavos
  currency                String    @db.VarChar(3)
  
  customer_email          String    @db.VarChar(255)
  customer_name           String?   @db.VarChar(255)
  customer_phone          String?   @db.VarChar(50)
  
  metadata                Json?     @db.JsonB
  
  created_at              DateTime  @default(now()) @db.Timestamptz
  updated_at              DateTime  @updatedAt @db.Timestamptz

  product                 B2BProduct @relation(fields: [product_id], references: [id], onDelete: Cascade)
  user                    User?      @relation(fields: [user_id], references: [id], onDelete: SetNull)

  @@index([user_id])
  @@index([product_id])
  @@index([status])
  @@index([customer_email])
  @@index([created_at])
  @@map("b2b_purchases")
}

// Adicionar ao modelo User existente:
model User {
  // ... campos existentes ...
  b2b_purchases B2BPurchase[]
}
```

## Domain Layer

### Entities

#### B2BProductEntity

```typescript
export class B2BProductEntity {
  constructor(
    public readonly id: string,
    public readonly stripeProductId: string,
    public readonly stripePriceId: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly price: number, // centavos
    public readonly currency: string,
    public readonly active: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  isActive(): boolean {
    return this.active;
  }

  getPriceInReais(): number {
    return this.price / 100;
  }
}
```

#### B2BPurchaseEntity

```typescript
export class B2BPurchaseEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string | null,
    public readonly productId: string,
    public readonly stripeCheckoutId: string | null,
    public readonly stripePaymentIntent: string | null,
    public readonly checkoutStartedAt: Date | null,
    public readonly checkoutCompletedAt: Date | null,
    public readonly checkoutAbandonedAt: Date | null,
    public readonly status: EPurchaseStatus,
    public readonly amount: number,
    public readonly currency: string,
    public readonly customerEmail: string,
    public readonly customerName: string | null,
    public readonly customerPhone: string | null,
    public readonly metadata: Record<string, any> | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  isCompleted(): boolean {
    return this.status === EPurchaseStatus.COMPLETED;
  }

  isAbandoned(): boolean {
    return this.status === EPurchaseStatus.ABANDONED;
  }

  isPending(): boolean {
    return this.status === EPurchaseStatus.PENDING;
  }

  getAmountInReais(): number {
    return this.amount / 100;
  }

  getCheckoutDuration(): number | null {
    if (!this.checkoutStartedAt || !this.checkoutCompletedAt) {
      return null;
    }
    return this.checkoutCompletedAt.getTime() - this.checkoutStartedAt.getTime();
  }
}
```

### Enums

```typescript
export enum EPurchaseStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
  REFUNDED = 'refunded',
}
```

## Application Layer

### Use Cases

#### CreatePaymentLinkUseCase

**Input**: `CreatePaymentLinkDTO`
```typescript
{
  productId: string;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
}
```

**Output**:
```typescript
{
  checkoutUrl: string;
  purchaseId: string;
}
```

**Logic**:
1. Validar que produto existe e está ativo
2. Criar registro B2BPurchase com status `pending`
3. Criar Stripe Checkout Session com metadata
4. Retornar URL do checkout

#### ProcessB2BWebhookUseCase

**Events Handled**:
- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.succeeded`
- `charge.refunded`

**Logic for `checkout.session.completed`**:
1. Verificar idempotência
2. Buscar purchase por `stripe_checkout_id`
3. Atualizar status para `completed`
4. Registrar `checkout_completed_at`
5. Criar ou buscar User por email
6. Vincular `user_id` à purchase
7. Registrar evento processado

**Logic for `checkout.session.expired`**:
1. Buscar purchase por `stripe_checkout_id`
2. Atualizar status para `abandoned`
3. Registrar `checkout_abandoned_at`

#### GetMetricsUseCase

**Output**:
```typescript
{
  totalCheckoutsStarted: number;
  totalCheckoutsCompleted: number;
  totalCheckoutsAbandoned: number;
  conversionRate: number; // %
  abandonmentRate: number; // %
  totalRevenue: number; // em reais
  averageOrderValue: number; // em reais
  recentPurchases: B2BPurchaseEntity[];
}
```

## Infrastructure Layer

### Controllers

#### B2BPaymentsController

```typescript
@Controller('b2b/payments')
@UseGuards(AdminJwtGuard)
@ApiTags('B2B Payments')
export class B2BPaymentsController {
  @Post('create-link')
  async createPaymentLink(@Body() dto: CreatePaymentLinkDTO) {}

  @Get('purchases')
  async listPurchases(@Query() query: ListPurchasesQueryDTO) {}

  @Get('purchases/:id')
  async getPurchase(@Param('id') id: string) {}

  @Get('products')
  async listProducts() {}

  @Get('metrics')
  async getMetrics() {}
}
```

#### B2BWebhookController

```typescript
@Controller('webhooks/b2b')
export class B2BWebhookController {
  @Post('stripe')
  async handleStripeWebhook(@Req() req: Request) {
    // Validar assinatura
    // Processar evento
    // Retornar 200 OK
  }
}
```

### Repositories

#### PrismaB2BPurchaseRepository

**Methods**:
- `create(data): Promise<B2BPurchaseEntity>`
- `findById(id): Promise<B2BPurchaseEntity | null>`
- `findByStripeCheckoutId(id): Promise<B2BPurchaseEntity | null>`
- `findByStripePaymentIntent(id): Promise<B2BPurchaseEntity | null>`
- `findAll(filters, pagination): Promise<B2BPurchaseEntity[]>`
- `updateStatus(id, status, timestamps): Promise<void>`
- `linkUser(purchaseId, userId): Promise<void>`
- `countByStatus(status): Promise<number>`
- `getTotalRevenue(): Promise<number>`

## Integration with Stripe

### Checkout Session Creation

```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'payment', // One-time payment
  line_items: [
    {
      price: product.stripePriceId,
      quantity: 1,
    },
  ],
  customer_email: dto.customerEmail,
  metadata: {
    purchase_id: purchase.id,
    product_id: product.id,
    customer_email: dto.customerEmail,
  },
  success_url: `${process.env.FRONTEND_URL}/b2b/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.FRONTEND_URL}/b2b/cancel`,
});
```

### Webhook Events

**checkout.session.completed**:
```json
{
  "id": "evt_xxx",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_xxx",
      "payment_intent": "pi_xxx",
      "customer_email": "cliente@email.com",
      "amount_total": 50000,
      "currency": "brl",
      "metadata": {
        "purchase_id": "uuid",
        "product_id": "uuid"
      }
    }
  }
}
```

## Environment Variables

```env
# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET_B2B=whsec_xxx

# Frontend
FRONTEND_URL=https://seusite.com
```

## API Response Examples

### Create Payment Link

**Request**:
```json
POST /api/b2b/payments/create-link
{
  "productId": "uuid",
  "customerEmail": "cliente@email.com",
  "customerName": "João Silva",
  "customerPhone": "+5511999999999"
}
```

**Response**:
```json
{
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_xxx",
  "purchaseId": "uuid"
}
```

### List Purchases

**Request**:
```
GET /api/b2b/payments/purchases?status=completed&limit=10&offset=0
```

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "productName": "Consultoria Premium",
      "customerEmail": "cliente@email.com",
      "customerName": "João Silva",
      "amount": 50000,
      "currency": "brl",
      "status": "completed",
      "checkoutStartedAt": "2026-04-28T10:00:00Z",
      "checkoutCompletedAt": "2026-04-28T10:05:00Z",
      "createdAt": "2026-04-28T10:00:00Z"
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

### Get Metrics

**Response**:
```json
{
  "totalCheckoutsStarted": 100,
  "totalCheckoutsCompleted": 75,
  "totalCheckoutsAbandoned": 20,
  "conversionRate": 75.0,
  "abandonmentRate": 20.0,
  "totalRevenue": 375000.00,
  "averageOrderValue": 5000.00,
  "recentPurchases": [...]
}
```

## Security Considerations

1. **Webhook Validation**: Sempre validar assinatura do Stripe
2. **Admin Only**: Endpoints protegidos com `AdminJwtGuard`
3. **Email Validation**: Validar formato de email
4. **Rate Limiting**: Limitar criação de links por IP
5. **Idempotency**: Prevenir processamento duplicado de webhooks

## Performance Optimizations

1. **Indexes**: Criar índices em `status`, `customer_email`, `created_at`
2. **Pagination**: Sempre paginar listagens
3. **Caching**: Cache de métricas por 5 minutos
4. **Async Processing**: Processar webhooks de forma assíncrona se necessário

## Testing Strategy

1. **Unit Tests**: Entities, use cases
2. **Integration Tests**: Repositories com banco de teste
3. **E2E Tests**: Fluxo completo de pagamento (mock Stripe)
4. **Webhook Tests**: Simular eventos do Stripe
