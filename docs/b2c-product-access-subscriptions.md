# B2C — Sistema de Acesso a Produtos por Subscription

> Este documento descreve como implementar um sistema B2C onde alunos compram produtos (cursos/conteúdos) e o acesso é controlado por subscriptions. Suporta 4 modos de cobrança: **Recorrente Ilimitado**, **Recorrente Limitado**, **Pagamento Único** e **Pagamento Único com Expiração**.

---

## 1. Visão geral do modelo

### Como funciona

```
1. Aluno cria conta (User)
2. Aluno vê lista de produtos disponíveis (Product)
3. Cada produto tem 1 ou mais preços (ProductPrice) com modos diferentes:
   - Recorrente Ilimitado: paga mensalmente até cancelar
   - Recorrente Limitado: paga 12x e depois cancela automaticamente
   - Pagamento Único: paga 1x e tem acesso vitalício
   - Pagamento Único com Expiração: paga 1x e tem acesso por 30 dias (exemplo)

4. Aluno compra um produto → cria UserProductAccess
5. Guard verifica se tem acesso ativo antes de liberar conteúdo
6. Quando subscription expira/cancela → acesso é bloqueado automaticamente
```

**Diferença do modelo de créditos:** não tem consumo, não tem "gastar" nada. É só controle de acesso: tem subscription ativa = acessa, não tem = bloqueado.

---

## 2. Banco de dados

### 2.1 `User` — o aluno

```prisma
model User {
  id                 Int      @id @default(autoincrement())
  name               String   @db.VarChar(100)
  email              String   @unique @db.VarChar(150)
  stripe_customer_id String?  @unique @db.VarChar(100)
  created_at         DateTime @default(now())
  updated_at         DateTime @updatedAt

  UserCredential     UserCredential?
  UserSessionToken   UserSessionToken[]
  UserProductAccess  UserProductAccess[]
}
```

### 2.2 `Product` — o produto/curso

```prisma
model Product {
  id                String   @id @default(cuid())
  stripe_product_id String   @unique @db.VarChar(100)
  name              String   @db.VarChar(255)
  description       String?  @db.Text
  slug              String   @unique @db.VarChar(100)
  active            Boolean  @default(true)
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt

  ProductPrice      ProductPrice[]
  UserProductAccess UserProductAccess[]
}
```

### 2.3 `ProductPrice` — os preços do produto

Um produto pode ter múltiplos preços (mensal, anual, vitalício, etc.).

```prisma
model ProductPrice {
  id                   String   @id @default(cuid())
  stripe_price_id      String   @unique @db.VarChar(100)
  product_id           String
  Product              Product  @relation(fields: [product_id], references: [id])
  
  name                 String   @db.VarChar(100)  -- "Mensal", "Anual", "Vitalício"
  
  -- Configuração de cobrança
  billing_mode         String   @db.VarChar(20)
  -- "unlimited"    → Recorrente Ilimitado
  -- "limited"      → Recorrente Limitado
  -- "one_time"     → Pagamento Único (vitalício)
  -- "one_time_exp" → Pagamento Único com Expiração
  
  interval             String?  @db.VarChar(20)   -- 'month', 'year', 'week' (null se one_time)
  interval_count       Int?     @default(1)       -- 1, 3, 6, 12
  
  unit_amount          Int                         -- em centavos
  currency             String   @default("brl") @db.VarChar(3)
  
  -- Limites (só para modos específicos)
  max_billing_cycles   Int?                        -- só para "limited" (ex: 12)
  access_duration_days Int?                        -- só para "one_time_exp" (ex: 30)
  
  active               Boolean  @default(true)
  created_at           DateTime @default(now())
  updated_at           DateTime @updatedAt

  UserProductAccess    UserProductAccess[]
}
```

### 2.4 `UserProductAccess` — o acesso do aluno ao produto

Registra cada compra/acesso de um aluno a um produto.

```prisma
model UserProductAccess {
  id                       String    @id @default(cuid())
  user_id                  Int
  User                     User      @relation(fields: [user_id], references: [id])
  product_id               String
  Product                  Product   @relation(fields: [product_id], references: [id])
  product_price_id         String
  ProductPrice             ProductPrice @relation(fields: [product_price_id], references: [id])

  -- IDs do Stripe (null se for pagamento único)
  stripe_subscription_id   String?   @unique @db.VarChar(100)
  stripe_customer_id       String    @db.VarChar(100)
  stripe_price_id          String    @db.VarChar(100)
  stripe_payment_intent_id String?   @db.VarChar(100)  -- só para one_time

  -- Status e controle
  access_type              String    @db.VarChar(20)
  -- "subscription"  → recorrente (unlimited ou limited)
  -- "lifetime"      → vitalício (one_time)
  -- "temporary"     → temporário (one_time_exp)
  
  status                   String    @db.VarChar(50)
  -- "active"    → acesso liberado
  -- "expired"   → expirou (one_time_exp)
  -- "canceled"  → cancelado (subscription)
  -- "past_due"  → pagamento falhou

  -- Datas (para subscriptions)
  current_period_start     DateTime?
  current_period_end       DateTime?
  cancel_at_period_end     Boolean   @default(false)
  canceled_at              DateTime?

  -- Datas (para pagamento único com expiração)
  access_granted_at        DateTime  @default(now())
  access_expires_at        DateTime?

  -- Contador de cobranças (só para limited)
  max_billing_cycles       Int?
  completed_billing_cycles Int       @default(0)

  -- Valor pago
  amount                   Int       -- em centavos
  currency                 String    @default("brl") @db.VarChar(3)

  created_at               DateTime  @default(now())
  updated_at               DateTime  @updatedAt

  @@index([user_id, status])
  @@index([user_id, product_id, status])
  @@index([stripe_subscription_id])
}
```

### 2.5 `StripeWebhookEvent` — log de eventos (idempotência)

```prisma
model StripeWebhookEvent {
  id                  Int      @id @default(autoincrement())
  stripe_event_id     String   @unique @db.VarChar(255)
  event_type          String   @db.VarChar(100)
  payload             Json
  processed           Boolean  @default(false)
  error_message       String?  @db.Text
  processing_attempts Int      @default(0) @db.SmallInt
  created_at          DateTime @default(now())
  updated_at          DateTime @updatedAt

  @@index([processed, processing_attempts])
}
```

---

## 3. Os 4 modos de cobrança

### 3.1 Recorrente Ilimitado

**Comportamento:**
- Cobra mensalmente/anualmente até o aluno cancelar
- Acesso liberado enquanto subscription estiver ativa
- Aluno pode cancelar a qualquer momento

**No Stripe:**
```typescript
await stripe.prices.create({
  product: productId,
  unit_amount: 4990,
  currency: 'brl',
  recurring: { interval: 'month' },
});
```

**No banco:**
```typescript
{
  billing_mode: 'unlimited',
  interval: 'month',
  interval_count: 1,
  max_billing_cycles: null,
  access_duration_days: null,
}
```

**No UserProductAccess:**
```typescript
{
  access_type: 'subscription',
  status: 'active',
  stripe_subscription_id: 'sub_xxx',
  current_period_end: '2026-06-01',
  max_billing_cycles: null,
}
```

### 3.2 Recorrente Limitado

**Comportamento:**
- Cobra X vezes (ex: 12 meses) e depois cancela automaticamente
- Acesso liberado durante os X períodos
- Após X cobranças, subscription é cancelada e acesso bloqueado

**No Stripe:**
```typescript
// O price é igual ao ilimitado — o limite é controlado no backend
await stripe.prices.create({
  product: productId,
  unit_amount: 4990,
  currency: 'brl',
  recurring: { interval: 'month' },
  metadata: { billingMode: 'limited', maxBillingCycles: '12' },
});
```

**No banco:**
```typescript
{
  billing_mode: 'limited',
  interval: 'month',
  interval_count: 1,
  max_billing_cycles: 12,
  access_duration_days: null,
}
```

**No UserProductAccess:**
```typescript
{
  access_type: 'subscription',
  status: 'active',
  stripe_subscription_id: 'sub_xxx',
  current_period_end: '2026-06-01',
  max_billing_cycles: 12,
  completed_billing_cycles: 5,  // já cobrou 5 vezes, faltam 7
}
```

**Lógica no webhook `invoice.paid`:**
```typescript
// Incrementa o contador
access.completed_billing_cycles += 1;

// Se atingiu o limite, cancela
if (access.completed_billing_cycles >= access.max_billing_cycles) {
  await stripe.subscriptions.cancel(access.stripe_subscription_id, {
    prorate: false,
  });
  
  access.status = 'canceled';
  access.canceled_at = new Date();
}
```

### 3.3 Pagamento Único (vitalício)

**Comportamento:**
- Paga 1x e tem acesso para sempre
- Não tem renovação, não expira
- Não tem subscription no Stripe (é um `payment`)

**No Stripe:**
```typescript
await stripe.prices.create({
  product: productId,
  unit_amount: 29990,
  currency: 'brl',
  // SEM recurring — é pagamento único
});
```

**No banco:**
```typescript
{
  billing_mode: 'one_time',
  interval: null,
  interval_count: null,
  max_billing_cycles: null,
  access_duration_days: null,
}
```

**No UserProductAccess:**
```typescript
{
  access_type: 'lifetime',
  status: 'active',
  stripe_subscription_id: null,
  stripe_payment_intent_id: 'pi_xxx',
  access_granted_at: '2026-05-01',
  access_expires_at: null,  // nunca expira
}
```

**Lógica no webhook `checkout.session.completed`:**
```typescript
// Não cria subscription, só registra o acesso
await userProductAccessRepo.create({
  user_id: userId,
  product_id: productId,
  access_type: 'lifetime',
  status: 'active',
  stripe_payment_intent_id: session.payment_intent,
  access_expires_at: null,
});
```

### 3.4 Pagamento Único com Expiração

**Comportamento:**
- Paga 1x e tem acesso por X dias (ex: 30 dias)
- Após X dias, acesso é bloqueado automaticamente
- Não tem renovação

**No Stripe:**
```typescript
await stripe.prices.create({
  product: productId,
  unit_amount: 9990,
  currency: 'brl',
  // SEM recurring
  metadata: { billingMode: 'one_time_exp', accessDurationDays: '30' },
});
```

**No banco:**
```typescript
{
  billing_mode: 'one_time_exp',
  interval: null,
  interval_count: null,
  max_billing_cycles: null,
  access_duration_days: 30,
}
```

**No UserProductAccess:**
```typescript
{
  access_type: 'temporary',
  status: 'active',
  stripe_subscription_id: null,
  stripe_payment_intent_id: 'pi_xxx',
  access_granted_at: '2026-05-01',
  access_expires_at: '2026-05-31',  // 30 dias depois
}
```

**Lógica no webhook `checkout.session.completed`:**
```typescript
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + productPrice.access_duration_days);

await userProductAccessRepo.create({
  user_id: userId,
  product_id: productId,
  access_type: 'temporary',
  status: 'active',
  stripe_payment_intent_id: session.payment_intent,
  access_granted_at: new Date(),
  access_expires_at: expiresAt,
});
```

**Job para expirar acessos:**
```typescript
// Roda diariamente (cron job)
async expireTemporaryAccess() {
  const now = new Date();
  
  await prisma.userProductAccess.updateMany({
    where: {
      access_type: 'temporary',
      status: 'active',
      access_expires_at: { lt: now },
    },
    data: {
      status: 'expired',
    },
  });
}
```

---

## 4. Guard de acesso ao conteúdo

O guard verifica se o aluno tem acesso ativo ao produto antes de liberar o conteúdo.

```typescript
// product-access.guard.ts
@Injectable()
export class ProductAccessGuard implements CanActivate {
  constructor(private readonly accessRepo: UserProductAccessRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: number = request.user_id;
    const productSlug: string = request.params.slug;

    const hasAccess = await this.accessRepo.hasActiveAccess(userId, productSlug);

    if (!hasAccess) {
      throw new ForbiddenException('Você não tem acesso a este produto.');
    }

    return true;
  }
}
```

### Lógica de verificação de acesso

```typescript
// user-product-access.repository.ts
async hasActiveAccess(userId: number, productSlug: string): Promise<boolean> {
  const now = new Date();
  
  const access = await prisma.userProductAccess.findFirst({
    where: {
      user_id: userId,
      Product: { slug: productSlug },
      status: 'active',
      OR: [
        // Subscription ativa (unlimited ou limited)
        {
          access_type: 'subscription',
          current_period_end: { gte: now },
        },
        // Vitalício
        {
          access_type: 'lifetime',
        },
        // Temporário ainda válido
        {
          access_type: 'temporary',
          access_expires_at: { gte: now },
        },
      ],
    },
  });

  return access !== null;
}
```

---

## 5. Fluxo de compra

### 5.1 Checkout (todos os modos)

```typescript
// POST /products/:slug/checkout
async createCheckout({ userId, productSlug, priceId }) {
  // 1. Buscar produto e preço
  const price = await this.priceRepo.findByStripePriceId(priceId);
  const product = price.Product;

  // 2. Verificar se já tem acesso ativo
  const alreadyHasAccess = await this.accessRepo.hasActiveAccess(userId, productSlug);
  if (alreadyHasAccess) {
    throw new ConflictException('Você já tem acesso a este produto.');
  }

  // 3. Criar ou recuperar customer
  const user = await this.userRepo.findById(userId);
  let customerId = user.stripe_customer_id;

  if (!customerId) {
    const customer = await this.stripeProvider.createCustomer({
      email: user.email,
      name: user.name,
      metadata: { userId: userId.toString() },
    });
    customerId = customer.id;
    await this.userRepo.update(userId, { stripe_customer_id: customerId });
  }

  // 4. Criar checkout session
  const isSubscription = ['unlimited', 'limited'].includes(price.billing_mode);
  
  const session = await this.stripeProvider.createCheckoutSession({
    customerId,
    priceId,
    mode: isSubscription ? 'subscription' : 'payment',
    successUrl: `${process.env.FRONTEND_URL}/products/${productSlug}?checkout=success`,
    cancelUrl: `${process.env.FRONTEND_URL}/products/${productSlug}?checkout=canceled`,
    metadata: {
      userId: userId.toString(),
      productId: product.id,
      priceId: price.id,
      billingMode: price.billing_mode,
      maxBillingCycles: price.max_billing_cycles?.toString() ?? '',
      accessDurationDays: price.access_duration_days?.toString() ?? '',
    },
    ...(isSubscription && {
      subscriptionData: {
        metadata: {
          userId: userId.toString(),
          productId: product.id,
          billingMode: price.billing_mode,
          maxBillingCycles: price.max_billing_cycles?.toString() ?? '',
        },
      },
    }),
  });

  return { checkoutUrl: session.url };
}
```

### 5.2 Webhook `checkout.session.completed`

```typescript
private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = parseInt(session.metadata?.userId ?? '0');
  const productId = session.metadata?.productId;
  const priceId = session.metadata?.priceId;
  const billingMode = session.metadata?.billingMode;

  if (!userId || !productId || !priceId) return;

  const price = await this.priceRepo.findById(priceId);

  // Subscription (unlimited ou limited)
  if (['unlimited', 'limited'].includes(billingMode)) {
    const stripeSubId = session.subscription as string;
    const stripeSub = await this.stripeProvider.retrieveSubscription(stripeSubId);

    await this.accessRepo.create({
      user_id: userId,
      product_id: productId,
      product_price_id: priceId,
      stripe_subscription_id: stripeSubId,
      stripe_customer_id: session.customer as string,
      stripe_price_id: stripeSub.items.data[0].price.id,
      access_type: 'subscription',
      status: stripeSub.status,
      current_period_start: new Date(stripeSub.current_period_start * 1000),
      current_period_end: new Date(stripeSub.current_period_end * 1000),
      max_billing_cycles: price.max_billing_cycles,
      completed_billing_cycles: 1,
      amount: stripeSub.items.data[0].price.unit_amount ?? 0,
      currency: stripeSub.currency,
    });
  }
  
  // Pagamento único (one_time ou one_time_exp)
  else {
    const accessType = billingMode === 'one_time' ? 'lifetime' : 'temporary';
    const expiresAt = billingMode === 'one_time_exp'
      ? new Date(Date.now() + price.access_duration_days * 24 * 60 * 60 * 1000)
      : null;

    await this.accessRepo.create({
      user_id: userId,
      product_id: productId,
      product_price_id: priceId,
      stripe_customer_id: session.customer as string,
      stripe_price_id: session.metadata.priceId,
      stripe_payment_intent_id: session.payment_intent as string,
      access_type: accessType,
      status: 'active',
      access_granted_at: new Date(),
      access_expires_at: expiresAt,
      amount: session.amount_total ?? 0,
      currency: session.currency ?? 'brl',
    });
  }
}
```

### 5.3 Webhook `invoice.paid` (renovação de subscription)

```typescript
private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const stripeSubId = invoice.subscription as string;
  if (!stripeSubId) return;

  const access = await this.accessRepo.findByStripeSubscriptionId(stripeSubId);
  if (!access) return;

  // Buscar subscription atualizada no Stripe
  const stripeSub = await this.stripeProvider.retrieveSubscription(stripeSubId);

  // Incrementar contador de cobranças
  const newCycleCount = access.completed_billing_cycles + 1;

  // Atualizar período e contador
  await this.accessRepo.update(access.id, {
    status: 'active',
    current_period_start: new Date(stripeSub.current_period_start * 1000),
    current_period_end: new Date(stripeSub.current_period_end * 1000),
    completed_billing_cycles: newCycleCount,
  });

  // Se for limited e atingiu o limite, cancela
  if (access.max_billing_cycles && newCycleCount >= access.max_billing_cycles) {
    await this.stripeProvider.cancelSubscription(stripeSubId, false);
    
    await this.accessRepo.update(access.id, {
      status: 'canceled',
      canceled_at: new Date(),
    });
  }
}
```

### 5.4 Webhook `customer.subscription.deleted`

```typescript
private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const access = await this.accessRepo.findByStripeSubscriptionId(subscription.id);
  if (!access) return;

  await this.accessRepo.update(access.id, {
    status: 'canceled',
    canceled_at: new Date(),
  });
}
```

---

## 6. Endpoint de criação de produto no painel

```typescript
// POST /admin/products
async createProduct({
  name,
  description,
  slug,
  prices,  // array de preços
}: {
  name: string;
  description?: string;
  slug: string;
  prices: Array<{
    name: string;
    billingMode: 'unlimited' | 'limited' | 'one_time' | 'one_time_exp';
    interval?: 'month' | 'year' | 'week';
    intervalCount?: number;
    unitAmount: number;
    maxBillingCycles?: number;
    accessDurationDays?: number;
  }>;
}) {
  // 1. Criar produto no Stripe
  const stripeProduct = await this.stripeProvider.createProduct({
    name,
    description,
    metadata: { slug },
  });

  // 2. Salvar produto no banco
  const product = await this.productRepo.create({
    stripe_product_id: stripeProduct.id,
    name,
    description,
    slug,
    active: true,
  });

  // 3. Criar cada preço
  const createdPrices = [];
  
  for (const priceData of prices) {
    const isSubscription = ['unlimited', 'limited'].includes(priceData.billingMode);
    
    // Criar price no Stripe
    const stripePrice = isSubscription
      ? await this.stripeProvider.createRecurringPrice({
          productId: stripeProduct.id,
          unitAmount: priceData.unitAmount,
          currency: 'brl',
          interval: priceData.interval!,
          intervalCount: priceData.intervalCount ?? 1,
          metadata: {
            billingMode: priceData.billingMode,
            maxBillingCycles: priceData.maxBillingCycles?.toString() ?? '',
          },
        })
      : await this.stripeProvider.createOneTimePrice({
          productId: stripeProduct.id,
          unitAmount: priceData.unitAmount,
          currency: 'brl',
          metadata: {
            billingMode: priceData.billingMode,
            accessDurationDays: priceData.accessDurationDays?.toString() ?? '',
          },
        });

    // Salvar price no banco
    const productPrice = await this.productPriceRepo.create({
      stripe_price_id: stripePrice.id,
      product_id: product.id,
      name: priceData.name,
      billing_mode: priceData.billingMode,
      interval: priceData.interval ?? null,
      interval_count: priceData.intervalCount ?? null,
      unit_amount: priceData.unitAmount,
      currency: 'brl',
      max_billing_cycles: priceData.maxBillingCycles ?? null,
      access_duration_days: priceData.accessDurationDays ?? null,
      active: true,
    });

    createdPrices.push(productPrice);
  }

  return { product, prices: createdPrices };
}
```

### Exemplo de chamada:

```json
{
  "name": "Curso de React Avançado",
  "slug": "react-avancado",
  "description": "Aprenda React do zero ao avançado",
  "prices": [
    {
      "name": "Mensal",
      "billingMode": "unlimited",
      "interval": "month",
      "intervalCount": 1,
      "unitAmount": 4990
    },
    {
      "name": "12 Meses",
      "billingMode": "limited",
      "interval": "month",
      "intervalCount": 1,
      "unitAmount": 4990,
      "maxBillingCycles": 12
    },
    {
      "name": "Vitalício",
      "billingMode": "one_time",
      "unitAmount": 49990
    },
    {
      "name": "30 Dias",
      "billingMode": "one_time_exp",
      "unitAmount": 1990,
      "accessDurationDays": 30
    }
  ]
}
```

---

## 7. Endpoints da API

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| `GET` | `/products` | Público | Listar produtos ativos |
| `GET` | `/products/:slug` | Público | Detalhes de um produto |
| `POST` | `/products/:slug/checkout` | JwtGuard | Iniciar checkout |
| `GET` | `/products/:slug/content` | JwtGuard + ProductAccessGuard | Acessar conteúdo |
| `GET` | `/my/products` | JwtGuard | Listar produtos que o aluno tem acesso |
| `POST` | `/my/products/:id/cancel` | JwtGuard | Cancelar subscription |
| `POST` | `/webhooks/stripe` | Stripe signature | Webhook do Stripe |
| `POST` | `/admin/products` | AdminGuard | Criar produto |
| `PATCH` | `/admin/products/:id` | AdminGuard | Editar produto |
| `DELETE` | `/admin/products/:id` | AdminGuard | Arquivar produto |

---

## 8. Resumo dos 4 modos

| Modo | Stripe mode | Recorrência | Expira | Cancela | Exemplo |
|------|-------------|-------------|--------|---------|---------|
| **Recorrente Ilimitado** | `subscription` | Sim | Não | Manual | Netflix |
| **Recorrente Limitado** | `subscription` | Sim | Após X cobranças | Automático | Curso de 12 meses |
| **Pagamento Único** | `payment` | Não | Não | N/A | Compra de livro digital |
| **Pagamento Único com Expiração** | `payment` | Não | Após X dias | Automático | Trial de 30 dias |

---

*Documento gerado em 28/04/2026 — modelo B2C focado em acesso a produtos sem sistema de créditos.*
