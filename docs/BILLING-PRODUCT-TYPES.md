# Billing Product Types - Implementation Guide

## Product Types

### 1. recurring_infinite
- **Stripe**: Standard recurring subscription (monthly/yearly)
- **Backend**: No special handling
- **Behavior**: Charges indefinitely until user cancels

### 2. recurring_limited
- **Stripe**: Standard recurring subscription
- **Backend**: Tracks `charges_count` and `max_charges`
- **Behavior**: 
  - Increments `charges_count` on each `invoice.paid`
  - When `charges_count >= max_charges`, sets `cancel_at_period_end = true`
  - Subscription ends after final period

### 3. one_time_with_expiration
- **Stripe**: Subscription with `cancel_at_period_end = true` set immediately
- **Backend**: Calculates `access_expires_at` based on `access_duration_days`
- **Behavior**:
  - Single payment processed
  - Subscription canceled after first period
  - Access controlled by `access_expires_at` date
  - Cron job checks expired access and updates status

## Database Schema

```prisma
model ProductPrice {
  product_type           String  @default("recurring_infinite")
  max_charges            Int?    // For recurring_limited
  access_duration_days   Int?    // For one_time_with_expiration
}

model UserSubscription {
  product_type           String  @default("recurring_infinite")
  charges_count          Int     @default(0)
  max_charges            Int?
  access_expires_at      DateTime?
  auto_cancel_scheduled  Boolean @default(false)
}
```

## Webhook Flow

### checkout.session.completed
1. Extract metadata: `productType`, `maxCharges`, `accessDurationDays`
2. Create `UserSubscription` with product type fields
3. If `one_time_with_expiration`:
   - Calculate `access_expires_at`
   - Set `cancel_at_period_end = true` in Stripe

### invoice.paid
1. Increment `charges_count`
2. If `recurring_limited` and `charges_count >= max_charges`:
   - Call Stripe API: `subscriptions.update({ cancel_at_period_end: true })`
   - Set `auto_cancel_scheduled = true`

### customer.subscription.updated
- Sync status changes from Stripe

### customer.subscription.deleted
- Set status to `canceled`

## Access Control

### SubscriptionAccessGuard
```typescript
- Check status in ['active', 'trialing']
- If one_time_with_expiration:
  - Check access_expires_at > now
```

## Cron Job

### CheckExpiredAccessUseCase
```typescript
- Find subscriptions where access_expires_at <= now
- Cancel in Stripe
- Update local status to 'canceled'
```

## Stripe Configuration

### recurring_infinite
```typescript
stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: 'price_xxx', quantity: 1 }],
})
```

### recurring_limited
```typescript
// Same as recurring_infinite
// Backend handles cancellation via webhook
```

### one_time_with_expiration
```typescript
stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: 'price_xxx', quantity: 1 }],
  subscription_data: {
    metadata: {
      cancelAfterFirstPayment: 'true',
      accessDurationDays: '365',
    },
  },
})
```

## Migration

```sql
-- Add to ProductPrice
ALTER TABLE "b2c_product_prices" 
ADD COLUMN "product_type" VARCHAR(30) NOT NULL DEFAULT 'recurring_infinite',
ADD COLUMN "max_charges" INT,
ADD COLUMN "access_duration_days" INT;

-- Add to UserSubscription
ALTER TABLE "b2c_user_subscriptions"
ADD COLUMN "product_type" VARCHAR(30) NOT NULL DEFAULT 'recurring_infinite',
ADD COLUMN "charges_count" INT NOT NULL DEFAULT 0,
ADD COLUMN "max_charges" INT,
ADD COLUMN "access_expires_at" TIMESTAMP(3),
ADD COLUMN "auto_cancel_scheduled" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "b2c_user_subscriptions_access_expires_at_idx" 
ON "b2c_user_subscriptions"("access_expires_at");
```

## Example Usage

### Create Product Price (recurring_limited)
```typescript
await prisma.productPrice.create({
  data: {
    product_type: 'recurring_limited',
    max_charges: 12,  // 12 monthly payments
    interval: 'month',
    unit_amount: 3990,
  },
});
```

### Create Product Price (one_time_with_expiration)
```typescript
await prisma.productPrice.create({
  data: {
    product_type: 'one_time_with_expiration',
    access_duration_days: 365,  // 1 year access
    interval: 'month',
    unit_amount: 47900,
  },
});
```
