# Coupon/Discount System — Design Spec
**Date:** 2026-05-10  
**Status:** Approved  
**Scope:** B2B + B2C, tenant-scoped

---

## 1. Overview

Implement a coupon/discount system that integrates with the existing B2B payment flow (cart checkout, payment link) and B2C checkout flow. Coupons are managed via admin CRUD and validated publicly by customers entering codes in the cart before reaching Stripe checkout.

Discounts are calculated entirely on the backend. A single Stripe Coupon object (`amount_off`) is created dynamically per checkout session and archived automatically after use (via webhook).

---

## 2. Module Structure

New module: `src/modules/zarp-coupons/` following the existing Clean Architecture pattern.

```
src/modules/zarp-coupons/
├── application/
│   ├── dtos/
│   │   ├── create-coupon.dto.ts
│   │   ├── update-coupon.dto.ts
│   │   ├── validate-coupon.dto.ts
│   │   └── coupon-validation-result.dto.ts
│   └── use-cases/
│       ├── create-coupon.use-case.ts
│       ├── update-coupon.use-case.ts
│       ├── delete-coupon.use-case.ts
│       ├── list-coupons.use-case.ts
│       ├── get-coupon.use-case.ts
│       └── validate-coupon.use-case.ts
├── domain/
│   ├── entities/
│   │   └── discount-coupon.entity.ts
│   ├── enums/
│   │   ├── discount-type.enum.ts    # percentage | fixed_amount
│   │   ├── coupon-scope.enum.ts     # order | product | category
│   │   └── coupon-applies-to.enum.ts # b2b | b2c | both
│   └── interfaces/
│       ├── discount-coupon.repository.interface.ts
│       └── tokens.ts
├── infrastructure/
│   ├── controllers/
│   │   ├── admin-coupons.controller.ts
│   │   └── public-coupons.controller.ts
│   └── repositories/
│       └── prisma-discount-coupon.repository.ts
└── zarp-coupons.module.ts
```

---

## 3. Domain Entity

### `DiscountCouponEntity`

| Field | Type | Description |
|---|---|---|
| `id` | string | CUID |
| `tenantId` | string | Tenant scope |
| `code` | string | Unique per tenant (e.g. `PROMO10`) |
| `name` | string | Human-readable label |
| `description` | string? | Optional display text |
| `discountType` | `percentage \| fixed_amount` | Discount calculation mode |
| `discountValue` | number | Percentage (0–100) or cents |
| `scope` | `order \| product \| category` | What the coupon applies to |
| `productIds` | string[] | Eligible product IDs (scope=product) |
| `categoryIds` | string[] | Eligible category IDs (scope=category) |
| `appliesTo` | `b2b \| b2c \| both` | Which checkout flow accepts this coupon |
| `cumulative` | boolean | Can stack with other coupons |
| `minOrderAmount` | number? | Minimum cart total in cents to activate |
| `maxDiscountAmount` | number? | Cap on discount amount in cents |
| `maxRedemptions` | number? | Max uses (null = unlimited) |
| `redeemedCount` | number | Usage counter |
| `expiresAt` | Date? | Expiry datetime |
| `active` | boolean | Enabled/disabled |
| `createdAt` | Date | |
| `updatedAt` | Date | |

---

## 4. Prisma Schema Addition

```prisma
model DiscountCoupon {
  id                  String   @id @default(cuid()) @db.VarChar(25)
  tenant_id           String   @db.VarChar(25)

  code                String   @db.VarChar(100)
  name                String   @db.VarChar(255)
  description         String?  @db.Text

  discount_type       String   @db.VarChar(20)   // percentage | fixed_amount
  discount_value      Float                       // % or cents
  scope               String   @db.VarChar(20)   // order | product | category
  product_ids         String[] @default([])
  category_ids        String[] @default([])
  applies_to          String   @db.VarChar(10)   // b2b | b2c | both

  cumulative          Boolean  @default(false)
  min_order_amount    Int?                        // cents
  max_discount_amount Int?                        // cents cap
  max_redemptions     Int?                        // null = unlimited
  redeemed_count      Int      @default(0)

  expires_at          DateTime?
  active              Boolean  @default(true)

  created_at          DateTime @default(now())
  updated_at          DateTime @updatedAt

  tenant              Tenant   @relation("DiscountCoupons", fields: [tenant_id], references: [id], onDelete: Cascade)

  @@unique([tenant_id, code])
  @@index([tenant_id])
  @@index([tenant_id, active])
  @@index([tenant_id, code])
  @@map("discount_coupons")
}
```

Add to `Tenant` model:
```prisma
discountCoupons DiscountCoupon[] @relation("DiscountCoupons")
```

---

## 5. Discount Calculation Logic

### `ValidateCouponUseCase.execute(tenantId, codes[], cartItems[], context: 'b2b'|'b2c')`

```
For each code in codes[]:
  1. Fetch coupon by (tenantId, code) → throw if not found
  2. Validate: active=true, not expired, redeemedCount < maxRedemptions (or unlimited)
  3. Validate appliesTo matches context (b2b/b2c/both)
  4. Validate cumulativity:
     - If any previously accepted coupon has cumulative=false → reject this code
     - If this coupon has cumulative=false and there are already accepted coupons → reject

  5. Validate minOrderAmount: cartTotal >= minOrderAmount (if set)

  6. Compute eligible base amount:
     - scope=order    → sum of all cartItem.basePrice * quantity
     - scope=product  → sum of cartItems where productId ∈ coupon.productIds
     - scope=category → sum of cartItems where categoryId ∈ coupon.categoryIds

  7. Compute raw discount:
     - percentage  → eligibleAmount × (discountValue / 100)
     - fixed_amount → min(discountValue, eligibleAmount)

  8. Apply cap: min(rawDiscount, maxDiscountAmount ?? ∞)
  → append to acceptedCoupons[]

totalDiscount = sum of all individual discounts
totalDiscount = min(totalDiscount, cartTotal)  // never negative
```

### Return type: `CouponValidationResult`
```typescript
{
  valid: boolean
  coupons: Array<{
    code: string
    discountAmount: number   // cents
    description: string
  }>
  totalDiscount: number      // cents
  orderTotal: number         // cents (before discount)
  finalTotal: number         // cents (after discount)
}
```

---

## 6. Checkout Integration

### Modified DTOs

**`CreateCartCheckoutDTO`** — add optional field:
```typescript
couponCodes?: string[]   // validated and re-calculated server-side
```

**`CreatePaymentLinkDTO`** — same addition:
```typescript
couponCodes?: string[]
```

### Modified Use Cases

**`CreateCartCheckoutUseCase`** and **`CreatePaymentLinkUseCase`**:

```
(existing flow unchanged until Stripe session creation)

If dto.couponCodes present and non-empty:
  a. Call ValidateCouponUseCase → get totalDiscount
  b. If totalDiscount > 0:
     → stripe.coupons.create({
          amount_off: totalDiscount,
          currency: product.currency,
          duration: 'once',
          max_redemptions: 1,
          name: 'Desconto aplicado',
          metadata: { tenant_id, coupon_codes: codes.join(',') }
        })
     → store stripe_coupon_id in local variable

  c. stripe.checkout.sessions.create({
       ...existing params,
       discounts: stripe_coupon_id ? [{ coupon: stripe_coupon_id }] : undefined
     })

  d. Store in purchase.metadata:
     {
       ...existing metadata,
       coupon_codes: codes.join(','),
       discount_amount: totalDiscount,
       stripe_coupon_id: stripe_coupon_id
     }

  e. Atomically increment redeemedCount for each coupon (inside Prisma $transaction):
     - If coupon.maxRedemptions is null → simple increment (unlimited, no race condition risk)
     - If coupon.maxRedemptions is set → conditional update:
         prisma.discountCoupon.updateMany({
           where: { tenant_id, code, redeemed_count: { lt: max_redemptions } },
           data: { redeemed_count: { increment: 1 } }
         })
       If updateMany returns count=0 for any coupon → coupon was exhausted concurrently;
       throw ConflictException('Cupom esgotado') before Stripe session is created
```

### Webhook: `ProcessB2BWebhookUseCase`

**`checkout.session.completed`** (addition to existing logic):
```
If metadata.stripe_coupon_id exists:
  → stripe.coupons.del(stripe_coupon_id)   // archive from Stripe dashboard
```

**`checkout.session.expired`** (addition to existing logic):
```
If metadata.stripe_coupon_id exists:
  → stripe.coupons.del(stripe_coupon_id)
  → Decrement redeemedCount for each coupon code in metadata.coupon_codes
    (reversal: session expired before payment, so usage should be returned)
```

---

## 7. API Endpoints

### Admin (protected by `AdminJwtGuard`, `x-tenant-id` header)

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/coupons` | List all coupons (with pagination) |
| `GET` | `/admin/coupons/:id` | Get single coupon |
| `POST` | `/admin/coupons` | Create coupon |
| `PUT` | `/admin/coupons/:id` | Update coupon |
| `DELETE` | `/admin/coupons/:id` | Soft-delete (sets active=false) |

### Public

| Method | Path | Description |
|---|---|---|
| `POST` | `/public/coupons/validate` | Validate code(s) against cart, return discount breakdown |

---

## 8. Security

### Rate Limiting
`POST /public/coupons/validate` must be protected by throttling:
- Apply `@Throttle()` decorator (NestJS ThrottlerModule)
- Suggested limits: 10 requests/minute per IP
- Error responses are generic: `"Cupom inválido"` regardless of reason (not found, expired, exhausted)

### Atomic Redemption Counter
The `redeemedCount` increment uses `updateMany` with a conditional `WHERE redeemed_count < max_redemptions` inside a Prisma `$transaction`. If `count = 0` is returned (coupon was exhausted concurrently), the use case throws `ConflictException('Cupom esgotado')` before the Stripe session is created.

### Server-side Re-validation
`ValidateCouponUseCase` is called inside `CreateCartCheckoutUseCase` (not before it). The value returned from the public `/validate` endpoint is for UX only — the discount is always recalculated from scratch at checkout creation time.

### Tenant Isolation
All repository queries filter by `tenantId`. A coupon code from Tenant A cannot be resolved in Tenant B's checkout.

---

## 9. Module Dependencies

`ZarpCouponsModule` exports `ValidateCouponUseCase`.

`ZarpB2BPaymentsModule` imports `ZarpCouponsModule` to inject `ValidateCouponUseCase` into the modified checkout use cases.

B2C checkout modules (if applicable) follow the same pattern.

---

## 10. Out of Scope

- Stripe Promotion Codes (customer-facing codes in the Stripe dashboard) — we manage codes ourselves
- Per-user coupon assignment (a coupon usable by only one specific user)
- Coupon analytics dashboard (metrics on redemption rates)
- Automatic coupon suggestions at checkout
