# Billing Product Types - Modelo Híbrido (Melhor dos 2 Mundos)

## Mudanças Principais

### ✅ Mantido do nosso modelo:
- **Multi-tenancy**: `tenant_id` em todas as tabelas
- **Integração existente**: User, Tenant, stripe_customer_id
- **Arquitetura DDD**: Separação domain/application/infrastructure

### ✅ Adotado do documento:
- **4 modos de cobrança**: unlimited, limited, one_time, one_time_exp
- **Separação Stripe**: `mode: 'subscription'` vs `mode: 'payment'`
- **Campos de controle**: `access_type`, `stripe_payment_intent_id`, `access_granted_at`
- **Nomenclatura**: `UserProductAccess` (mais semântico que `UserSubscription`)
- **Guard robusto**: Verifica `access_type` + datas

## Os 4 Modos de Cobrança

### 1. unlimited (Recorrente Ilimitado)
```typescript
// Stripe
mode: 'subscription'
recurring: { interval: 'month' }

// DB
billing_mode: 'unlimited'
access_type: 'subscription'
stripe_subscription_id: 'sub_xxx'
```

### 2. limited (Recorrente Limitado)
```typescript
// Stripe
mode: 'subscription'
recurring: { interval: 'month' }

// DB
billing_mode: 'limited'
access_type: 'subscription'
max_billing_cycles: 12
completed_billing_cycles: 5

// Backend cancela após N cobranças
```

### 3. one_time (Pagamento Único Vitalício)
```typescript
// Stripe
mode: 'payment'  // ← NÃO cria subscription

// DB
billing_mode: 'one_time'
access_type: 'lifetime'
stripe_payment_intent_id: 'pi_xxx'
access_expires_at: null  // nunca expira
```

### 4. one_time_exp (Pagamento Único com Expiração)
```typescript
// Stripe
mode: 'payment'

// DB
billing_mode: 'one_time_exp'
access_type: 'temporary'
stripe_payment_intent_id: 'pi_xxx'
access_expires_at: '2026-06-01'  // expira após X dias
```

## Schema Refatorado

### ProductPrice
```prisma
model ProductPrice {
  name                 String   // "Mensal", "Anual", "Vitalício"
  billing_mode         String   // unlimited | limited | one_time | one_time_exp
  interval             String?  // month | year (null para one_time)
  max_billing_cycles   Int?     // Para limited
  access_duration_days Int?     // Para one_time_exp
}
```

### UserProductAccess (antes UserSubscription)
```prisma
model UserProductAccess {
  // Stripe IDs (subscription OU payment)
  stripe_subscription_id   String?  // Para subscription modes
  stripe_payment_intent_id String?  // Para one_time modes
  
  // Controle de acesso
  access_type              String   // subscription | lifetime | temporary
  status                   String   // active | expired | canceled
  
  // Subscription fields
  current_period_start     DateTime?
  current_period_end       DateTime?
  
  // One-time fields
  access_granted_at        DateTime
  access_expires_at        DateTime?  // null = vitalício
  
  // Billing cycle tracking
  max_billing_cycles       Int?
  completed_billing_cycles Int
}
```

## Fluxo de Checkout

### Subscription (unlimited/limited)
```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: 'price_xxx', quantity: 1 }],
  subscription_data: {
    metadata: {
      billingMode: 'limited',
      maxBillingCycles: '12',
    },
  },
});
```

### Payment (one_time/one_time_exp)
```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'payment',  // ← Não cria subscription
  line_items: [{ price: 'price_xxx', quantity: 1 }],
  metadata: {
    billingMode: 'one_time_exp',
    accessDurationDays: '30',
  },
});
```

## Webhooks

### checkout.session.completed
```typescript
const billingMode = session.metadata.billingMode;
const isSubscription = ['unlimited', 'limited'].includes(billingMode);

if (isSubscription) {
  // Buscar subscription no Stripe
  const stripeSub = await stripe.subscriptions.retrieve(session.subscription);
  
  await accessRepo.create({
    access_type: 'subscription',
    stripe_subscription_id: stripeSub.id,
    current_period_end: new Date(stripeSub.current_period_end * 1000),
    max_billing_cycles: billingMode === 'limited' ? 12 : null,
  });
} else {
  // Pagamento único
  const accessType = billingMode === 'one_time' ? 'lifetime' : 'temporary';
  const expiresAt = billingMode === 'one_time_exp'
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    : null;
  
  await accessRepo.create({
    access_type: accessType,
    stripe_payment_intent_id: session.payment_intent,
    access_granted_at: new Date(),
    access_expires_at: expiresAt,
  });
}
```

### invoice.paid (só para subscriptions)
```typescript
const access = await accessRepo.findByStripeSubscriptionId(invoice.subscription);

access.completed_billing_cycles += 1;

// Se limited e atingiu limite, cancela
if (access.max_billing_cycles && access.completed_billing_cycles >= access.max_billing_cycles) {
  await stripe.subscriptions.cancel(access.stripe_subscription_id);
  access.status = 'canceled';
}
```

## Guard de Acesso

```typescript
async hasActiveAccess(userId: string, productSlug: string): Promise<boolean> {
  const now = new Date();
  
  const access = await prisma.userProductAccess.findFirst({
    where: {
      user_id: userId,
      Product: { slug: productSlug },
      status: 'active',
      OR: [
        // Subscription ativa
        {
          access_type: 'subscription',
          current_period_end: { gte: now },
        },
        // Vitalício
        {
          access_type: 'lifetime',
        },
        // Temporário válido
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

## Migration

```sql
-- Rename table
ALTER TABLE "b2c_user_subscriptions" RENAME TO "b2c_user_product_access";

-- Add new columns
ALTER TABLE "b2c_user_product_access"
ADD COLUMN "access_type" VARCHAR(20) NOT NULL DEFAULT 'subscription',
ADD COLUMN "stripe_payment_intent_id" VARCHAR(100),
ADD COLUMN "access_granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "max_billing_cycles" INT,
ADD COLUMN "completed_billing_cycles" INT NOT NULL DEFAULT 0;

-- Make subscription fields nullable
ALTER TABLE "b2c_user_product_access"
ALTER COLUMN "stripe_subscription_id" DROP NOT NULL,
ALTER COLUMN "current_period_start" DROP NOT NULL,
ALTER COLUMN "current_period_end" DROP NOT NULL;

-- Update ProductPrice
ALTER TABLE "b2c_product_prices"
ADD COLUMN "name" VARCHAR(100) NOT NULL DEFAULT 'Default',
ADD COLUMN "billing_mode" VARCHAR(20) NOT NULL DEFAULT 'unlimited',
ADD COLUMN "max_billing_cycles" INT,
ALTER COLUMN "interval" DROP NOT NULL;
```

## Comparação Final

| Aspecto | Nosso Modelo Original | Documento | Modelo Híbrido |
|---------|----------------------|-----------|----------------|
| Multi-tenancy | ✅ Sim | ❌ Não | ✅ Sim |
| Modos | 3 | 4 | ✅ 4 |
| Stripe correto | ❌ subscription para tudo | ✅ payment para one-time | ✅ payment |
| Campos controle | Básico | ✅ Completo | ✅ Completo |
| Nomenclatura | UserSubscription | ✅ UserProductAccess | ✅ UserProductAccess |
| Arquitetura | ✅ DDD | Simples | ✅ DDD |

**Resultado**: Melhor dos dois mundos mantendo compatibilidade com sistema existente.
