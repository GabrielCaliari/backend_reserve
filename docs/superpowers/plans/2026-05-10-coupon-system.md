# Coupon System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a tenant-scoped coupon/discount system (B2B + B2C) with CRUD admin management, public validation endpoint, and Stripe checkout integration that creates a dynamic `amount_off` coupon per session and archives it after use.

**Architecture:** New `reserve-coupons` module (Clean Architecture: domain/application/infrastructure) exports `ValidateCouponUseCase`. The B2B checkout use cases (`CreateCartCheckoutUseCase`, `CreatePaymentLinkUseCase`) import this module and inject the use case. Discounts are always re-calculated server-side at checkout time — the public validate endpoint is UX-only. Atomic redemption is enforced with a conditional Prisma `updateMany` inside a transaction; the Stripe coupon is archived via webhook after payment or session expiry.

**Tech Stack:** NestJS 11, Prisma (PostgreSQL), Stripe Node SDK (`2025-02-24.acacia`), class-validator, Jest, `@nestjs/throttler` (new dependency for rate limiting).

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `src/modules/reserve-coupons/domain/enums/discount-type.enum.ts` | `percentage \| fixed_amount` |
| `src/modules/reserve-coupons/domain/enums/coupon-scope.enum.ts` | `order \| product \| category` |
| `src/modules/reserve-coupons/domain/enums/coupon-applies-to.enum.ts` | `b2b \| b2c \| both` |
| `src/modules/reserve-coupons/domain/entities/discount-coupon.entity.ts` | Pure domain object |
| `src/modules/reserve-coupons/domain/interfaces/discount-coupon.repository.interface.ts` | Contract + DI token |
| `src/modules/reserve-coupons/application/dtos/create-coupon.dto.ts` | Admin create DTO |
| `src/modules/reserve-coupons/application/dtos/update-coupon.dto.ts` | Admin update DTO |
| `src/modules/reserve-coupons/application/dtos/validate-coupon.dto.ts` | Public validate DTO |
| `src/modules/reserve-coupons/application/use-cases/validate-coupon.use-case.ts` | Core discount calculation |
| `src/modules/reserve-coupons/application/use-cases/validate-coupon.use-case.spec.ts` | Unit tests |
| `src/modules/reserve-coupons/application/use-cases/create-coupon.use-case.ts` | Admin CRUD |
| `src/modules/reserve-coupons/application/use-cases/update-coupon.use-case.ts` | Admin CRUD |
| `src/modules/reserve-coupons/application/use-cases/delete-coupon.use-case.ts` | Soft-delete |
| `src/modules/reserve-coupons/application/use-cases/list-coupons.use-case.ts` | Paginated list |
| `src/modules/reserve-coupons/application/use-cases/get-coupon.use-case.ts` | Get by ID |
| `src/modules/reserve-coupons/infrastructure/repositories/prisma-discount-coupon.repository.ts` | Prisma implementation |
| `src/modules/reserve-coupons/infrastructure/controllers/admin-coupons.controller.ts` | CRUD endpoints |
| `src/modules/reserve-coupons/infrastructure/controllers/public-coupons.controller.ts` | Public validate endpoint |
| `src/modules/reserve-coupons/reserve-coupons.module.ts` | NestJS module wiring |

### Modified files
| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `DiscountCoupon` model + `Tenant` relation |
| `src/modules/reserve-b2b-payments/application/dtos/create-cart-checkout.dto.ts` | Add `couponCodes?` |
| `src/modules/reserve-b2b-payments/application/dtos/create-payment-link.dto.ts` | Add `couponCodes?` |
| `src/modules/reserve-b2b-payments/application/use-cases/create-cart-checkout.use-case.ts` | Coupon discount + Stripe coupon creation |
| `src/modules/reserve-b2b-payments/application/use-cases/create-payment-link.use-case.ts` | Coupon discount + Stripe coupon creation |
| `src/modules/reserve-b2b-payments/application/use-cases/process-b2b-webhook.use-case.ts` | Archive Stripe coupon + decrement on expiry |
| `src/modules/reserve-b2b-payments/infrastructure/controllers/b2b-webhook.controller.ts` | Pass `stripe` instance to use case |
| `src/modules/reserve-b2b-payments/reserve-b2b-payments.module.ts` | Import `ReserveCouponsModule` |
| `src/app.module.ts` | Register `ReserveCouponsModule` |

---

## Task 1: Prisma Schema — Add DiscountCoupon model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1.1: Add the model to schema.prisma**

Open `prisma/schema.prisma`. After the `B2BPurchase` model (end of file, around line 1792), add:

```prisma
// ============================================
// Discount Coupons — Shared B2B + B2C
// ============================================

model DiscountCoupon {
  id                  String   @id @default(cuid()) @db.VarChar(25)
  tenant_id           String   @db.VarChar(25)

  code                String   @db.VarChar(100)
  name                String   @db.VarChar(255)
  description         String?  @db.Text

  discount_type       String   @db.VarChar(20)   // percentage | fixed_amount
  discount_value      Float                       // % (0-100) or cents
  scope               String   @db.VarChar(20)   // order | product | category
  product_ids         String[] @default([])
  category_ids        String[] @default([])
  applies_to          String   @db.VarChar(10)   // b2b | b2c | both

  cumulative          Boolean  @default(false)
  min_order_amount    Int?                        // minimum cart total in cents
  max_discount_amount Int?                        // cap in cents
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
  @@map("discount_coupons")
}
```

- [ ] **Step 1.2: Add relation to Tenant model**

Find the `Tenant` model in `prisma/schema.prisma`. Add the following line inside the model body (after existing relations):

```prisma
  discountCoupons     DiscountCoupon[] @relation("DiscountCoupons")
```

- [ ] **Step 1.3: Run migration**

```bash
npx prisma migrate dev --name add_discount_coupons
```

Expected output: `The following migration(s) have been created and applied: .../add_discount_coupons`

- [ ] **Step 1.4: Verify Prisma client is regenerated**

```bash
npx prisma generate
```

Expected: `Generated Prisma Client` (no errors).

- [ ] **Step 1.5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(coupons): add discount_coupons table migration"
```

---

## Task 2: Domain Layer — Enums, Entity, Repository Interface

**Files:**
- Create: `src/modules/reserve-coupons/domain/enums/discount-type.enum.ts`
- Create: `src/modules/reserve-coupons/domain/enums/coupon-scope.enum.ts`
- Create: `src/modules/reserve-coupons/domain/enums/coupon-applies-to.enum.ts`
- Create: `src/modules/reserve-coupons/domain/entities/discount-coupon.entity.ts`
- Create: `src/modules/reserve-coupons/domain/interfaces/discount-coupon.repository.interface.ts`

- [ ] **Step 2.1: Create enums**

`src/modules/reserve-coupons/domain/enums/discount-type.enum.ts`:
```typescript
export enum EDiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
}
```

`src/modules/reserve-coupons/domain/enums/coupon-scope.enum.ts`:
```typescript
export enum ECouponScope {
  ORDER = 'order',
  PRODUCT = 'product',
  CATEGORY = 'category',
}
```

`src/modules/reserve-coupons/domain/enums/coupon-applies-to.enum.ts`:
```typescript
export enum ECouponAppliesTo {
  B2B = 'b2b',
  B2C = 'b2c',
  BOTH = 'both',
}
```

- [ ] **Step 2.2: Create entity**

`src/modules/reserve-coupons/domain/entities/discount-coupon.entity.ts`:
```typescript
import { EDiscountType } from '../enums/discount-type.enum';
import { ECouponScope } from '../enums/coupon-scope.enum';
import { ECouponAppliesTo } from '../enums/coupon-applies-to.enum';

export class DiscountCouponEntity {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly code: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly discountType: EDiscountType,
    public readonly discountValue: number,
    public readonly scope: ECouponScope,
    public readonly productIds: string[],
    public readonly categoryIds: string[],
    public readonly appliesTo: ECouponAppliesTo,
    public readonly cumulative: boolean,
    public readonly minOrderAmount: number | null,
    public readonly maxDiscountAmount: number | null,
    public readonly maxRedemptions: number | null,
    public readonly redeemedCount: number,
    public readonly expiresAt: Date | null,
    public readonly active: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  isValid(): boolean {
    if (!this.active) return false;
    if (this.expiresAt && this.expiresAt < new Date()) return false;
    if (this.maxRedemptions !== null && this.redeemedCount >= this.maxRedemptions) return false;
    return true;
  }

  appliesToContext(context: 'b2b' | 'b2c'): boolean {
    return this.appliesTo === ECouponAppliesTo.BOTH || this.appliesTo === context;
  }
}
```

- [ ] **Step 2.3: Create repository interface**

`src/modules/reserve-coupons/domain/interfaces/discount-coupon.repository.interface.ts`:
```typescript
import { DiscountCouponEntity } from '../entities/discount-coupon.entity';

export const DISCOUNT_COUPON_REPOSITORY = Symbol('DISCOUNT_COUPON_REPOSITORY');

export interface CreateCouponData {
  tenantId: string;
  code: string;
  name: string;
  description?: string | null;
  discountType: string;
  discountValue: number;
  scope: string;
  productIds?: string[];
  categoryIds?: string[];
  appliesTo: string;
  cumulative?: boolean;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  maxRedemptions?: number | null;
  expiresAt?: Date | null;
}

export interface UpdateCouponData {
  name?: string;
  description?: string | null;
  discountValue?: number;
  productIds?: string[];
  categoryIds?: string[];
  appliesTo?: string;
  cumulative?: boolean;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  maxRedemptions?: number | null;
  expiresAt?: Date | null;
  active?: boolean;
}

export interface CouponListResult {
  data: DiscountCouponEntity[];
  total: number;
}

export interface IDiscountCouponRepository {
  create(data: CreateCouponData): Promise<DiscountCouponEntity>;
  findById(id: string, tenantId: string): Promise<DiscountCouponEntity | null>;
  findByCode(tenantId: string, code: string): Promise<DiscountCouponEntity | null>;
  findAllByTenant(tenantId: string, page: number, limit: number): Promise<CouponListResult>;
  update(id: string, tenantId: string, data: UpdateCouponData): Promise<DiscountCouponEntity>;
  deactivate(id: string, tenantId: string): Promise<void>;
  incrementRedeemedCount(tenantId: string, code: string, maxRedemptions: number | null): Promise<boolean>;
  decrementRedeemedCount(tenantId: string, code: string): Promise<void>;
}
```

- [ ] **Step 2.4: Commit**

```bash
git add src/modules/reserve-coupons/domain/
git commit -m "feat(coupons): add domain layer - enums, entity, repository interface"
```

---

## Task 3: DTOs

**Files:**
- Create: `src/modules/reserve-coupons/application/dtos/create-coupon.dto.ts`
- Create: `src/modules/reserve-coupons/application/dtos/update-coupon.dto.ts`
- Create: `src/modules/reserve-coupons/application/dtos/validate-coupon.dto.ts`

- [ ] **Step 3.1: Create `create-coupon.dto.ts`**

`src/modules/reserve-coupons/application/dtos/create-coupon.dto.ts`:
```typescript
import {
  IsString, IsNotEmpty, IsEnum, IsNumber, Min, Max,
  IsOptional, IsArray, IsBoolean, IsInt, IsISO8601, IsPositive,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EDiscountType } from '../../domain/enums/discount-type.enum';
import { ECouponScope } from '../../domain/enums/coupon-scope.enum';
import { ECouponAppliesTo } from '../../domain/enums/coupon-applies-to.enum';

export class CreateCouponDTO {
  @ApiProperty({ example: 'PROMO10', description: 'Código único do cupom (convertido para maiúsculas)' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value).toUpperCase().trim())
  code: string;

  @ApiProperty({ example: '10% de desconto em todos os produtos' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Válido até o final do mês' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: EDiscountType, example: EDiscountType.PERCENTAGE })
  @IsEnum(EDiscountType)
  discountType: EDiscountType;

  @ApiProperty({ example: 10, description: 'Percentual (0-100) ou valor em centavos' })
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiProperty({ enum: ECouponScope, example: ECouponScope.ORDER })
  @IsEnum(ECouponScope)
  scope: ECouponScope;

  @ApiPropertyOptional({ type: [String], example: ['prod_abc123'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productIds?: string[];

  @ApiPropertyOptional({ type: [String], example: ['cat_abc123'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[];

  @ApiProperty({ enum: ECouponAppliesTo, example: ECouponAppliesTo.BOTH })
  @IsEnum(ECouponAppliesTo)
  appliesTo: ECouponAppliesTo;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  cumulative?: boolean;

  @ApiPropertyOptional({ example: 5000, description: 'Valor mínimo do pedido em centavos' })
  @IsInt()
  @Min(0)
  @IsOptional()
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: 10000, description: 'Desconto máximo em centavos' })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ example: 100, description: 'Máximo de resgates (null = ilimitado)' })
  @IsInt()
  @IsPositive()
  @IsOptional()
  maxRedemptions?: number;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z' })
  @IsISO8601()
  @IsOptional()
  expiresAt?: string;
}
```

- [ ] **Step 3.2: Create `update-coupon.dto.ts`**

`src/modules/reserve-coupons/application/dtos/update-coupon.dto.ts`:
```typescript
import {
  IsString, IsNumber, Min, IsOptional, IsArray,
  IsBoolean, IsInt, IsISO8601, IsPositive, IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ECouponAppliesTo } from '../../domain/enums/coupon-applies-to.enum';

export class UpdateCouponDTO {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  discountValue?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[];

  @ApiPropertyOptional({ enum: ECouponAppliesTo })
  @IsEnum(ECouponAppliesTo)
  @IsOptional()
  appliesTo?: ECouponAppliesTo;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  cumulative?: boolean;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  minOrderAmount?: number | null;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  maxDiscountAmount?: number | null;

  @ApiPropertyOptional()
  @IsInt()
  @IsPositive()
  @IsOptional()
  maxRedemptions?: number | null;

  @ApiPropertyOptional()
  @IsISO8601()
  @IsOptional()
  expiresAt?: string | null;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
```

- [ ] **Step 3.3: Create `validate-coupon.dto.ts`**

`src/modules/reserve-coupons/application/dtos/validate-coupon.dto.ts`:
```typescript
import {
  IsArray, IsString, IsNotEmpty, IsInt, Min, IsOptional,
  ValidateNested, IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidateCouponCartItemDTO {
  @ApiProperty({ example: 'prod_abc123' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({ example: 'cat_xyz456' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ example: 10000, description: 'Preço base em centavos (por unidade)' })
  @IsInt()
  @Min(1)
  basePrice: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class ValidateCouponDTO {
  @ApiProperty({ type: [String], example: ['PROMO10', 'FRETE20'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  codes: string[];

  @ApiProperty({ type: [ValidateCouponCartItemDTO] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValidateCouponCartItemDTO)
  cartItems: ValidateCouponCartItemDTO[];

  @ApiProperty({ enum: ['b2b', 'b2c'], example: 'b2b' })
  @IsEnum(['b2b', 'b2c'])
  context: 'b2b' | 'b2c';
}
```

- [ ] **Step 3.4: Commit**

```bash
git add src/modules/reserve-coupons/application/dtos/
git commit -m "feat(coupons): add application DTOs"
```

---

## Task 4: ValidateCouponUseCase + Tests

**Files:**
- Create: `src/modules/reserve-coupons/application/use-cases/validate-coupon.use-case.ts`
- Create: `src/modules/reserve-coupons/application/use-cases/validate-coupon.use-case.spec.ts`

- [ ] **Step 4.1: Write failing tests**

`src/modules/reserve-coupons/application/use-cases/validate-coupon.use-case.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { ValidateCouponUseCase, CartItemForValidation, CouponValidationResult } from './validate-coupon.use-case';
import { DISCOUNT_COUPON_REPOSITORY } from '../../domain/interfaces/discount-coupon.repository.interface';
import { DiscountCouponEntity } from '../../domain/entities/discount-coupon.entity';
import { EDiscountType } from '../../domain/enums/discount-type.enum';
import { ECouponScope } from '../../domain/enums/coupon-scope.enum';
import { ECouponAppliesTo } from '../../domain/enums/coupon-applies-to.enum';

const makeCoupon = (overrides: Partial<ConstructorParameters<typeof DiscountCouponEntity>[0]> = {}): DiscountCouponEntity => {
  const defaults = {
    id: 'coup_1',
    tenantId: 'tenant_1',
    code: 'PROMO10',
    name: '10% desconto',
    description: null,
    discountType: EDiscountType.PERCENTAGE,
    discountValue: 10,
    scope: ECouponScope.ORDER,
    productIds: [],
    categoryIds: [],
    appliesTo: ECouponAppliesTo.BOTH,
    cumulative: true,
    minOrderAmount: null,
    maxDiscountAmount: null,
    maxRedemptions: null,
    redeemedCount: 0,
    expiresAt: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const merged = { ...defaults, ...overrides };
  return new DiscountCouponEntity(
    merged.id, merged.tenantId, merged.code, merged.name, merged.description,
    merged.discountType, merged.discountValue, merged.scope, merged.productIds,
    merged.categoryIds, merged.appliesTo, merged.cumulative, merged.minOrderAmount,
    merged.maxDiscountAmount, merged.maxRedemptions, merged.redeemedCount,
    merged.expiresAt, merged.active, merged.createdAt, merged.updatedAt,
  );
};

const cartItems: CartItemForValidation[] = [
  { productId: 'prod_1', categoryId: 'cat_1', basePrice: 10000, quantity: 2 },
  { productId: 'prod_2', categoryId: 'cat_2', basePrice: 5000, quantity: 1 },
];

const mockRepo = {
  findByCode: jest.fn(),
};

describe('ValidateCouponUseCase', () => {
  let useCase: ValidateCouponUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateCouponUseCase,
        { provide: DISCOUNT_COUPON_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();
    useCase = module.get(ValidateCouponUseCase);
    jest.clearAllMocks();
  });

  describe('scope=order, percentage', () => {
    it('applies 10% discount to full cart total (R$250,00)', async () => {
      mockRepo.findByCode.mockResolvedValue(makeCoupon());
      const result = await useCase.execute('tenant_1', ['PROMO10'], cartItems, 'b2b');
      // cartTotal = 10000*2 + 5000*1 = 25000
      expect(result.totalDiscount).toBe(2500);
      expect(result.finalTotal).toBe(22500);
      expect(result.coupons[0].code).toBe('PROMO10');
    });
  });

  describe('scope=product', () => {
    it('applies discount only to eligible products', async () => {
      mockRepo.findByCode.mockResolvedValue(makeCoupon({
        scope: ECouponScope.PRODUCT,
        productIds: ['prod_1'],
        discountValue: 50,
        discountType: EDiscountType.PERCENTAGE,
      }));
      const result = await useCase.execute('tenant_1', ['PROMO10'], cartItems, 'b2b');
      // eligible = 10000*2 = 20000; discount = 10000
      expect(result.totalDiscount).toBe(10000);
      expect(result.finalTotal).toBe(15000);
    });
  });

  describe('scope=category', () => {
    it('applies discount only to items in eligible category', async () => {
      mockRepo.findByCode.mockResolvedValue(makeCoupon({
        scope: ECouponScope.CATEGORY,
        categoryIds: ['cat_2'],
        discountType: EDiscountType.FIXED_AMOUNT,
        discountValue: 2000,
      }));
      const result = await useCase.execute('tenant_1', ['PROMO10'], cartItems, 'b2b');
      // eligible = 5000*1 = 5000; fixed 2000 <= 5000
      expect(result.totalDiscount).toBe(2000);
      expect(result.finalTotal).toBe(23000);
    });
  });

  describe('maxDiscountAmount cap', () => {
    it('caps discount at maxDiscountAmount', async () => {
      mockRepo.findByCode.mockResolvedValue(makeCoupon({ maxDiscountAmount: 1000 }));
      const result = await useCase.execute('tenant_1', ['PROMO10'], cartItems, 'b2b');
      // 10% of 25000 = 2500, capped at 1000
      expect(result.totalDiscount).toBe(1000);
    });
  });

  describe('minOrderAmount', () => {
    it('rejects coupon when cart total is below minimum', async () => {
      mockRepo.findByCode.mockResolvedValue(makeCoupon({ minOrderAmount: 50000 }));
      await expect(
        useCase.execute('tenant_1', ['PROMO10'], cartItems, 'b2b'),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('cumulative stacking', () => {
    it('rejects a second coupon when first is non-cumulative', async () => {
      mockRepo.findByCode
        .mockResolvedValueOnce(makeCoupon({ code: 'A', cumulative: false }))
        .mockResolvedValueOnce(makeCoupon({ code: 'B', cumulative: true }));
      await expect(
        useCase.execute('tenant_1', ['A', 'B'], cartItems, 'b2b'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('stacks two cumulative coupons', async () => {
      mockRepo.findByCode
        .mockResolvedValueOnce(makeCoupon({ code: 'A', discountValue: 10, cumulative: true }))
        .mockResolvedValueOnce(makeCoupon({ code: 'B', discountValue: 5, cumulative: true }));
      const result = await useCase.execute('tenant_1', ['A', 'B'], cartItems, 'b2b');
      // 10% + 5% of 25000 = 2500 + 1250 = 3750
      expect(result.totalDiscount).toBe(3750);
    });
  });

  describe('invalid coupon', () => {
    it('throws when coupon not found', async () => {
      mockRepo.findByCode.mockResolvedValue(null);
      await expect(
        useCase.execute('tenant_1', ['NOTEXIST'], cartItems, 'b2b'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws when coupon is inactive', async () => {
      mockRepo.findByCode.mockResolvedValue(makeCoupon({ active: false }));
      await expect(
        useCase.execute('tenant_1', ['PROMO10'], cartItems, 'b2b'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws when coupon is expired', async () => {
      const past = new Date(Date.now() - 1000);
      mockRepo.findByCode.mockResolvedValue(makeCoupon({ expiresAt: past }));
      await expect(
        useCase.execute('tenant_1', ['PROMO10'], cartItems, 'b2b'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws when max redemptions exhausted', async () => {
      mockRepo.findByCode.mockResolvedValue(makeCoupon({ maxRedemptions: 5, redeemedCount: 5 }));
      await expect(
        useCase.execute('tenant_1', ['PROMO10'], cartItems, 'b2b'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws when coupon does not apply to context', async () => {
      mockRepo.findByCode.mockResolvedValue(makeCoupon({ appliesTo: ECouponAppliesTo.B2C }));
      await expect(
        useCase.execute('tenant_1', ['PROMO10'], cartItems, 'b2b'),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
```

- [ ] **Step 4.2: Run tests — verify they fail**

```bash
npx jest validate-coupon.use-case.spec.ts --no-coverage
```

Expected: `FAIL` — `ValidateCouponUseCase` not found.

- [ ] **Step 4.3: Implement `ValidateCouponUseCase`**

`src/modules/reserve-coupons/application/use-cases/validate-coupon.use-case.ts`:
```typescript
import { Injectable, Inject, UnprocessableEntityException } from '@nestjs/common';
import {
  IDiscountCouponRepository,
  DISCOUNT_COUPON_REPOSITORY,
} from '../../domain/interfaces/discount-coupon.repository.interface';
import { EDiscountType } from '../../domain/enums/discount-type.enum';
import { ECouponScope } from '../../domain/enums/coupon-scope.enum';

export interface CartItemForValidation {
  productId: string;
  categoryId?: string | null;
  basePrice: number;   // cents per unit
  quantity: number;
}

export interface CouponLineResult {
  code: string;
  discountAmount: number;  // cents
  description: string;
}

export interface CouponValidationResult {
  valid: boolean;
  coupons: CouponLineResult[];
  totalDiscount: number;
  orderTotal: number;
  finalTotal: number;
}

@Injectable()
export class ValidateCouponUseCase {
  constructor(
    @Inject(DISCOUNT_COUPON_REPOSITORY)
    private readonly couponRepo: IDiscountCouponRepository,
  ) {}

  async execute(
    tenantId: string,
    codes: string[],
    cartItems: CartItemForValidation[],
    context: 'b2b' | 'b2c',
  ): Promise<CouponValidationResult> {
    const cartTotal = cartItems.reduce((sum, i) => sum + i.basePrice * i.quantity, 0);
    const results: CouponLineResult[] = [];
    let hasNonCumulative = false;

    for (const rawCode of codes) {
      const code = rawCode.toUpperCase().trim();
      const coupon = await this.couponRepo.findByCode(tenantId, code);

      if (!coupon || !coupon.isValid()) {
        throw new UnprocessableEntityException(`Cupom inválido: ${code}`);
      }

      if (!coupon.appliesToContext(context)) {
        throw new UnprocessableEntityException(`Cupom inválido: ${code}`);
      }

      if (results.length > 0 && (!coupon.cumulative || hasNonCumulative)) {
        throw new UnprocessableEntityException(
          `O cupom ${code} não pode ser combinado com outros cupons`,
        );
      }

      if (coupon.minOrderAmount !== null && cartTotal < coupon.minOrderAmount) {
        throw new UnprocessableEntityException(
          `Cupom inválido: ${code}`,
        );
      }

      const eligible = this.computeEligibleAmount(coupon, cartItems);
      const rawDiscount = this.computeRawDiscount(coupon, eligible);
      const discount = coupon.maxDiscountAmount !== null
        ? Math.min(rawDiscount, coupon.maxDiscountAmount)
        : rawDiscount;

      if (!coupon.cumulative) hasNonCumulative = true;

      results.push({
        code,
        discountAmount: discount,
        description: this.buildDescription(coupon),
      });
    }

    let totalDiscount = results.reduce((s, r) => s + r.discountAmount, 0);
    totalDiscount = Math.min(totalDiscount, cartTotal);

    return {
      valid: true,
      coupons: results,
      totalDiscount,
      orderTotal: cartTotal,
      finalTotal: cartTotal - totalDiscount,
    };
  }

  private computeEligibleAmount(coupon: any, cartItems: CartItemForValidation[]): number {
    if (coupon.scope === ECouponScope.ORDER) {
      return cartItems.reduce((s, i) => s + i.basePrice * i.quantity, 0);
    }
    if (coupon.scope === ECouponScope.PRODUCT) {
      return cartItems
        .filter(i => coupon.productIds.includes(i.productId))
        .reduce((s, i) => s + i.basePrice * i.quantity, 0);
    }
    // ECouponScope.CATEGORY
    return cartItems
      .filter(i => i.categoryId && coupon.categoryIds.includes(i.categoryId))
      .reduce((s, i) => s + i.basePrice * i.quantity, 0);
  }

  private computeRawDiscount(coupon: any, eligibleAmount: number): number {
    if (coupon.discountType === EDiscountType.PERCENTAGE) {
      return Math.round(eligibleAmount * (coupon.discountValue / 100));
    }
    // EDiscountType.FIXED_AMOUNT
    return Math.min(coupon.discountValue, eligibleAmount);
  }

  private buildDescription(coupon: any): string {
    if (coupon.discountType === EDiscountType.PERCENTAGE) {
      return `${coupon.name} (${coupon.discountValue}%)`;
    }
    const reais = (coupon.discountValue / 100).toFixed(2).replace('.', ',');
    return `${coupon.name} (R$ ${reais})`;
  }
}
```

- [ ] **Step 4.4: Run tests — verify they pass**

```bash
npx jest validate-coupon.use-case.spec.ts --no-coverage
```

Expected: `PASS` with all 12 tests passing.

- [ ] **Step 4.5: Commit**

```bash
git add src/modules/reserve-coupons/application/use-cases/validate-coupon.use-case.ts \
        src/modules/reserve-coupons/application/use-cases/validate-coupon.use-case.spec.ts
git commit -m "feat(coupons): implement ValidateCouponUseCase with full test suite"
```

---

## Task 5: Admin CRUD Use Cases

**Files:**
- Create: `src/modules/reserve-coupons/application/use-cases/create-coupon.use-case.ts`
- Create: `src/modules/reserve-coupons/application/use-cases/update-coupon.use-case.ts`
- Create: `src/modules/reserve-coupons/application/use-cases/delete-coupon.use-case.ts`
- Create: `src/modules/reserve-coupons/application/use-cases/list-coupons.use-case.ts`
- Create: `src/modules/reserve-coupons/application/use-cases/get-coupon.use-case.ts`

- [ ] **Step 5.1: Create `create-coupon.use-case.ts`**

```typescript
import { Injectable, Inject, ConflictException } from '@nestjs/common';
import {
  IDiscountCouponRepository,
  DISCOUNT_COUPON_REPOSITORY,
} from '../../domain/interfaces/discount-coupon.repository.interface';
import { DiscountCouponEntity } from '../../domain/entities/discount-coupon.entity';
import { CreateCouponDTO } from '../dtos/create-coupon.dto';

@Injectable()
export class CreateCouponUseCase {
  constructor(
    @Inject(DISCOUNT_COUPON_REPOSITORY)
    private readonly couponRepo: IDiscountCouponRepository,
  ) {}

  async execute(tenantId: string, dto: CreateCouponDTO): Promise<DiscountCouponEntity> {
    const existing = await this.couponRepo.findByCode(tenantId, dto.code);
    if (existing) throw new ConflictException(`Cupom com código '${dto.code}' já existe`);

    return this.couponRepo.create({
      tenantId,
      code: dto.code,
      name: dto.name,
      description: dto.description ?? null,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      scope: dto.scope,
      productIds: dto.productIds ?? [],
      categoryIds: dto.categoryIds ?? [],
      appliesTo: dto.appliesTo,
      cumulative: dto.cumulative ?? false,
      minOrderAmount: dto.minOrderAmount ?? null,
      maxDiscountAmount: dto.maxDiscountAmount ?? null,
      maxRedemptions: dto.maxRedemptions ?? null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
  }
}
```

- [ ] **Step 5.2: Create `update-coupon.use-case.ts`**

```typescript
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  IDiscountCouponRepository,
  DISCOUNT_COUPON_REPOSITORY,
} from '../../domain/interfaces/discount-coupon.repository.interface';
import { DiscountCouponEntity } from '../../domain/entities/discount-coupon.entity';
import { UpdateCouponDTO } from '../dtos/update-coupon.dto';

@Injectable()
export class UpdateCouponUseCase {
  constructor(
    @Inject(DISCOUNT_COUPON_REPOSITORY)
    private readonly couponRepo: IDiscountCouponRepository,
  ) {}

  async execute(id: string, tenantId: string, dto: UpdateCouponDTO): Promise<DiscountCouponEntity> {
    const existing = await this.couponRepo.findById(id, tenantId);
    if (!existing) throw new NotFoundException('Cupom não encontrado');

    return this.couponRepo.update(id, tenantId, {
      name: dto.name,
      description: dto.description,
      discountValue: dto.discountValue,
      productIds: dto.productIds,
      categoryIds: dto.categoryIds,
      appliesTo: dto.appliesTo,
      cumulative: dto.cumulative,
      minOrderAmount: dto.minOrderAmount,
      maxDiscountAmount: dto.maxDiscountAmount,
      maxRedemptions: dto.maxRedemptions,
      expiresAt: dto.expiresAt !== undefined
        ? (dto.expiresAt ? new Date(dto.expiresAt) : null)
        : undefined,
      active: dto.active,
    });
  }
}
```

- [ ] **Step 5.3: Create `delete-coupon.use-case.ts`**

```typescript
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  IDiscountCouponRepository,
  DISCOUNT_COUPON_REPOSITORY,
} from '../../domain/interfaces/discount-coupon.repository.interface';

@Injectable()
export class DeleteCouponUseCase {
  constructor(
    @Inject(DISCOUNT_COUPON_REPOSITORY)
    private readonly couponRepo: IDiscountCouponRepository,
  ) {}

  async execute(id: string, tenantId: string): Promise<void> {
    const existing = await this.couponRepo.findById(id, tenantId);
    if (!existing) throw new NotFoundException('Cupom não encontrado');
    await this.couponRepo.deactivate(id, tenantId);
  }
}
```

- [ ] **Step 5.4: Create `list-coupons.use-case.ts`**

```typescript
import { Injectable, Inject } from '@nestjs/common';
import {
  IDiscountCouponRepository,
  DISCOUNT_COUPON_REPOSITORY,
  CouponListResult,
} from '../../domain/interfaces/discount-coupon.repository.interface';

@Injectable()
export class ListCouponsUseCase {
  constructor(
    @Inject(DISCOUNT_COUPON_REPOSITORY)
    private readonly couponRepo: IDiscountCouponRepository,
  ) {}

  async execute(tenantId: string, page = 1, limit = 20): Promise<CouponListResult> {
    return this.couponRepo.findAllByTenant(tenantId, page, limit);
  }
}
```

- [ ] **Step 5.5: Create `get-coupon.use-case.ts`**

```typescript
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  IDiscountCouponRepository,
  DISCOUNT_COUPON_REPOSITORY,
} from '../../domain/interfaces/discount-coupon.repository.interface';
import { DiscountCouponEntity } from '../../domain/entities/discount-coupon.entity';

@Injectable()
export class GetCouponUseCase {
  constructor(
    @Inject(DISCOUNT_COUPON_REPOSITORY)
    private readonly couponRepo: IDiscountCouponRepository,
  ) {}

  async execute(id: string, tenantId: string): Promise<DiscountCouponEntity> {
    const coupon = await this.couponRepo.findById(id, tenantId);
    if (!coupon) throw new NotFoundException('Cupom não encontrado');
    return coupon;
  }
}
```

- [ ] **Step 5.6: Commit**

```bash
git add src/modules/reserve-coupons/application/use-cases/
git commit -m "feat(coupons): add admin CRUD use cases"
```

---

## Task 6: Prisma Repository

**Files:**
- Create: `src/modules/reserve-coupons/infrastructure/repositories/prisma-discount-coupon.repository.ts`

- [ ] **Step 6.1: Implement the repository**

`src/modules/reserve-coupons/infrastructure/repositories/prisma-discount-coupon.repository.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  IDiscountCouponRepository,
  CreateCouponData,
  UpdateCouponData,
  CouponListResult,
} from '../../domain/interfaces/discount-coupon.repository.interface';
import { DiscountCouponEntity } from '../../domain/entities/discount-coupon.entity';
import { EDiscountType } from '../../domain/enums/discount-type.enum';
import { ECouponScope } from '../../domain/enums/coupon-scope.enum';
import { ECouponAppliesTo } from '../../domain/enums/coupon-applies-to.enum';

@Injectable()
export class PrismaDiscountCouponRepository implements IDiscountCouponRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCouponData): Promise<DiscountCouponEntity> {
    const record = await this.prisma.discountCoupon.create({
      data: {
        tenant_id: data.tenantId,
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        discount_type: data.discountType,
        discount_value: data.discountValue,
        scope: data.scope,
        product_ids: data.productIds ?? [],
        category_ids: data.categoryIds ?? [],
        applies_to: data.appliesTo,
        cumulative: data.cumulative ?? false,
        min_order_amount: data.minOrderAmount ?? null,
        max_discount_amount: data.maxDiscountAmount ?? null,
        max_redemptions: data.maxRedemptions ?? null,
        expires_at: data.expiresAt ?? null,
      },
    });
    return this.toDomain(record);
  }

  async findById(id: string, tenantId: string): Promise<DiscountCouponEntity | null> {
    const record = await this.prisma.discountCoupon.findFirst({
      where: { id, tenant_id: tenantId },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByCode(tenantId: string, code: string): Promise<DiscountCouponEntity | null> {
    const record = await this.prisma.discountCoupon.findUnique({
      where: { tenant_id_code: { tenant_id: tenantId, code } },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAllByTenant(tenantId: string, page: number, limit: number): Promise<CouponListResult> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.discountCoupon.findMany({
        where: { tenant_id: tenantId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.discountCoupon.count({ where: { tenant_id: tenantId } }),
    ]);
    return { data: data.map((r) => this.toDomain(r)), total };
  }

  async update(id: string, tenantId: string, data: UpdateCouponData): Promise<DiscountCouponEntity> {
    const record = await this.prisma.discountCoupon.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.discountValue !== undefined && { discount_value: data.discountValue }),
        ...(data.productIds !== undefined && { product_ids: data.productIds }),
        ...(data.categoryIds !== undefined && { category_ids: data.categoryIds }),
        ...(data.appliesTo !== undefined && { applies_to: data.appliesTo }),
        ...(data.cumulative !== undefined && { cumulative: data.cumulative }),
        ...(data.minOrderAmount !== undefined && { min_order_amount: data.minOrderAmount }),
        ...(data.maxDiscountAmount !== undefined && { max_discount_amount: data.maxDiscountAmount }),
        ...(data.maxRedemptions !== undefined && { max_redemptions: data.maxRedemptions }),
        ...(data.expiresAt !== undefined && { expires_at: data.expiresAt }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });
    return this.toDomain(record);
  }

  async deactivate(id: string, tenantId: string): Promise<void> {
    await this.prisma.discountCoupon.updateMany({
      where: { id, tenant_id: tenantId },
      data: { active: false },
    });
  }

  async incrementRedeemedCount(
    tenantId: string,
    code: string,
    maxRedemptions: number | null,
  ): Promise<boolean> {
    if (maxRedemptions === null) {
      await this.prisma.discountCoupon.updateMany({
        where: { tenant_id: tenantId, code },
        data: { redeemed_count: { increment: 1 } },
      });
      return true;
    }

    const result = await this.prisma.discountCoupon.updateMany({
      where: {
        tenant_id: tenantId,
        code,
        redeemed_count: { lt: maxRedemptions },
      },
      data: { redeemed_count: { increment: 1 } },
    });

    return result.count > 0;
  }

  async decrementRedeemedCount(tenantId: string, code: string): Promise<void> {
    await this.prisma.discountCoupon.updateMany({
      where: { tenant_id: tenantId, code, redeemed_count: { gt: 0 } },
      data: { redeemed_count: { decrement: 1 } },
    });
  }

  private toDomain(record: any): DiscountCouponEntity {
    return new DiscountCouponEntity(
      record.id,
      record.tenant_id,
      record.code,
      record.name,
      record.description ?? null,
      record.discount_type as EDiscountType,
      record.discount_value,
      record.scope as ECouponScope,
      record.product_ids ?? [],
      record.category_ids ?? [],
      record.applies_to as ECouponAppliesTo,
      record.cumulative,
      record.min_order_amount ?? null,
      record.max_discount_amount ?? null,
      record.max_redemptions ?? null,
      record.redeemed_count,
      record.expires_at ?? null,
      record.active,
      record.created_at,
      record.updated_at,
    );
  }
}
```

- [ ] **Step 6.2: Commit**

```bash
git add src/modules/reserve-coupons/infrastructure/repositories/
git commit -m "feat(coupons): implement PrismaDiscountCouponRepository"
```

---

## Task 7: Controllers + ReserveCouponsModule + Throttler

**Files:**
- Create: `src/modules/reserve-coupons/infrastructure/controllers/admin-coupons.controller.ts`
- Create: `src/modules/reserve-coupons/infrastructure/controllers/public-coupons.controller.ts`
- Create: `src/modules/reserve-coupons/reserve-coupons.module.ts`

- [ ] **Step 7.1: Install `@nestjs/throttler`**

```bash
npm install @nestjs/throttler
```

Expected: package added to `node_modules` and `package.json`.

- [ ] **Step 7.2: Create admin controller**

`src/modules/reserve-coupons/infrastructure/controllers/admin-coupons.controller.ts`:
```typescript
import {
  Controller, Get, Post, Put, Delete, Body, Param,
  UseGuards, Headers, BadRequestException, Query,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiHeader, ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { CreateCouponUseCase } from '../../application/use-cases/create-coupon.use-case';
import { UpdateCouponUseCase } from '../../application/use-cases/update-coupon.use-case';
import { DeleteCouponUseCase } from '../../application/use-cases/delete-coupon.use-case';
import { ListCouponsUseCase } from '../../application/use-cases/list-coupons.use-case';
import { GetCouponUseCase } from '../../application/use-cases/get-coupon.use-case';
import { CreateCouponDTO } from '../../application/dtos/create-coupon.dto';
import { UpdateCouponDTO } from '../../application/dtos/update-coupon.dto';

@ApiTags('Coupons — Admin')
@Controller('admin/coupons')
@UseGuards(AdminJwtGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID' })
export class AdminCouponsController {
  constructor(
    private readonly createCouponUseCase: CreateCouponUseCase,
    private readonly updateCouponUseCase: UpdateCouponUseCase,
    private readonly deleteCouponUseCase: DeleteCouponUseCase,
    private readonly listCouponsUseCase: ListCouponsUseCase,
    private readonly getCouponUseCase: GetCouponUseCase,
  ) {}

  private getTenantId(tenantId: string): string {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required');
    return tenantId;
  }

  @Get()
  @ApiOperation({ summary: 'Listar cupons do tenant (paginado)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.listCouponsUseCase.execute(
      this.getTenantId(tenantId),
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar cupom por ID' })
  @ApiParam({ name: 'id', description: 'ID do cupom' })
  async getById(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.getCouponUseCase.execute(id, this.getTenantId(tenantId));
  }

  @Post()
  @ApiOperation({ summary: 'Criar cupom' })
  @ApiResponse({ status: 201, description: 'Cupom criado' })
  @ApiResponse({ status: 409, description: 'Código já existe' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateCouponDTO,
  ) {
    return this.createCouponUseCase.execute(this.getTenantId(tenantId), dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar cupom' })
  @ApiParam({ name: 'id', description: 'ID do cupom' })
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCouponDTO,
  ) {
    return this.updateCouponUseCase.execute(id, this.getTenantId(tenantId), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desativar cupom (soft delete)' })
  @ApiParam({ name: 'id', description: 'ID do cupom' })
  @ApiResponse({ status: 200, description: 'Cupom desativado' })
  async remove(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    await this.deleteCouponUseCase.execute(id, this.getTenantId(tenantId));
    return { success: true };
  }
}
```

- [ ] **Step 7.3: Create public controller**

`src/modules/reserve-coupons/infrastructure/controllers/public-coupons.controller.ts`:
```typescript
import { Controller, Post, Body, Headers, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ValidateCouponUseCase } from '../../application/use-cases/validate-coupon.use-case';
import { ValidateCouponDTO } from '../../application/dtos/validate-coupon.dto';

@ApiTags('Coupons — Public')
@Controller('public/coupons')
export class PublicCouponsController {
  constructor(private readonly validateCouponUseCase: ValidateCouponUseCase) {}

  @Post('validate')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Validar cupom(s) contra o carrinho' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  @ApiResponse({ status: 200, description: 'Resultado da validação com breakdown de desconto' })
  @ApiResponse({ status: 422, description: 'Cupom inválido, expirado ou não aplicável' })
  async validate(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: ValidateCouponDTO,
  ) {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required');
    return this.validateCouponUseCase.execute(tenantId, dto.codes, dto.cartItems, dto.context);
  }
}
```

- [ ] **Step 7.4: Create `reserve-coupons.module.ts`**

`src/modules/reserve-coupons/reserve-coupons.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '../../shared/database/database.module';
import { ReserveAuthModule } from '../reserve-auth/reserve-auth.module';

import { CreateCouponUseCase } from './application/use-cases/create-coupon.use-case';
import { UpdateCouponUseCase } from './application/use-cases/update-coupon.use-case';
import { DeleteCouponUseCase } from './application/use-cases/delete-coupon.use-case';
import { ListCouponsUseCase } from './application/use-cases/list-coupons.use-case';
import { GetCouponUseCase } from './application/use-cases/get-coupon.use-case';
import { ValidateCouponUseCase } from './application/use-cases/validate-coupon.use-case';

import { PrismaDiscountCouponRepository } from './infrastructure/repositories/prisma-discount-coupon.repository';
import { DISCOUNT_COUPON_REPOSITORY } from './domain/interfaces/discount-coupon.repository.interface';

import { AdminCouponsController } from './infrastructure/controllers/admin-coupons.controller';
import { PublicCouponsController } from './infrastructure/controllers/public-coupons.controller';

@Module({
  imports: [
    DatabaseModule,
    ReserveAuthModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
  ],
  controllers: [AdminCouponsController, PublicCouponsController],
  providers: [
    CreateCouponUseCase,
    UpdateCouponUseCase,
    DeleteCouponUseCase,
    ListCouponsUseCase,
    GetCouponUseCase,
    ValidateCouponUseCase,
    { provide: DISCOUNT_COUPON_REPOSITORY, useClass: PrismaDiscountCouponRepository },
  ],
  exports: [ValidateCouponUseCase, DISCOUNT_COUPON_REPOSITORY],
})
export class ReserveCouponsModule {}
```

- [ ] **Step 7.5: Commit**

```bash
git add src/modules/reserve-coupons/infrastructure/ src/modules/reserve-coupons/reserve-coupons.module.ts package.json package-lock.json
git commit -m "feat(coupons): add controllers, module, and throttler setup"
```

---

## Task 8: Modify CreateCartCheckoutUseCase

**Files:**
- Modify: `src/modules/reserve-b2b-payments/application/dtos/create-cart-checkout.dto.ts`
- Modify: `src/modules/reserve-b2b-payments/application/use-cases/create-cart-checkout.use-case.ts`

- [ ] **Step 8.1: Add `couponCodes` to CreateCartCheckoutDTO**

In `src/modules/reserve-b2b-payments/application/dtos/create-cart-checkout.dto.ts`, add at the end of `CreateCartCheckoutDTO`:

```typescript
  @ApiPropertyOptional({
    type: [String],
    example: ['PROMO10'],
    description: 'Códigos de cupom de desconto (opcionais)',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  couponCodes?: string[];
```

Also add the missing imports at the top: `IsArray, IsOptional` (they may not be imported yet — check the existing imports line and add what's missing).

- [ ] **Step 8.2: Rewrite `CreateCartCheckoutUseCase`**

Replace the full contents of `src/modules/reserve-b2b-payments/application/use-cases/create-cart-checkout.use-case.ts`:

```typescript
import {
  Injectable, Inject, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import Stripe from 'stripe';
import {
  IB2BProductRepository,
  B2B_PRODUCT_REPOSITORY,
} from '../../domain/interfaces/b2b-product.repository.interface';
import {
  IB2BPurchaseRepository,
  B2B_PURCHASE_REPOSITORY,
} from '../../domain/interfaces/b2b-purchase.repository.interface';
import {
  ITenantBillingConfigRepository,
  TENANT_BILLING_CONFIG_REPOSITORY,
} from '../../../reserve-subscriptions/domain/interfaces/tenant-billing-config.repository.interface';
import {
  IDiscountCouponRepository,
  DISCOUNT_COUPON_REPOSITORY,
} from '../../../reserve-coupons/domain/interfaces/discount-coupon.repository.interface';
import { B2BProductEntity } from '../../domain/entities/b2b-product.entity';
import { CreateCartCheckoutDTO } from '../dtos/create-cart-checkout.dto';
import { CalculateB2BOrderCostUseCase } from './calculate-b2b-order-cost.use-case';
import { ValidateCouponUseCase, CartItemForValidation, CouponValidationResult } from '../../../reserve-coupons/application/use-cases/validate-coupon.use-case';
import { OrderCostBreakdown } from '../../../reserve-b2c-products/application/use-cases/resolve-product-fees.use-case';

const STRIPE_API_VERSION = '2025-02-24.acacia' as const;

@Injectable()
export class CreateCartCheckoutUseCase {
  constructor(
    @Inject(B2B_PRODUCT_REPOSITORY)
    private readonly productRepo: IB2BProductRepository,
    @Inject(B2B_PURCHASE_REPOSITORY)
    private readonly purchaseRepo: IB2BPurchaseRepository,
    @Inject(TENANT_BILLING_CONFIG_REPOSITORY)
    private readonly billingConfigRepo: ITenantBillingConfigRepository,
    @Inject(DISCOUNT_COUPON_REPOSITORY)
    private readonly couponRepo: IDiscountCouponRepository,
    private readonly calculateOrderCostUseCase: CalculateB2BOrderCostUseCase,
    private readonly validateCouponUseCase: ValidateCouponUseCase,
  ) {}

  async execute(
    tenantId: string,
    dto: CreateCartCheckoutDTO,
    userId?: string,
  ): Promise<{ checkoutUrl: string; purchaseIds: string[] }> {
    const stripeSecretKey = await this.billingConfigRepo.getStripeSecretKey(tenantId);
    if (!stripeSecretKey) {
      throw new BadRequestException('Stripe not configured for this tenant. Please contact support.');
    }

    const products = await this.resolveProducts(tenantId, dto.items.map((i) => i.productId));
    const costBreakdowns = new Map<string, OrderCostBreakdown>();
    for (const [productId] of products) {
      const breakdown = await this.calculateOrderCostUseCase.execute(tenantId, productId);
      costBreakdowns.set(productId, breakdown);
    }

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    let maxShippingFee = 0;
    let shippingCurrency = 'brl';

    for (const item of dto.items) {
      const product = products.get(item.productId)!;
      const breakdown = costBreakdowns.get(item.productId)!;

      lineItems.push({
        price_data: {
          currency: product.currency,
          product_data: { name: product.name },
          unit_amount: breakdown.basePrice,
        },
        quantity: item.quantity,
      });

      if (breakdown.chipCostAmount > 0) {
        lineItems.push({
          price_data: {
            currency: product.currency,
            product_data: { name: `Taxa de serviço — ${product.name} (${breakdown.chipCostPercent}%)` },
            unit_amount: breakdown.chipCostAmount,
          },
          quantity: item.quantity,
        });
      }

      if (breakdown.shippingFee > maxShippingFee) {
        maxShippingFee = breakdown.shippingFee;
        shippingCurrency = product.currency;
      }
    }

    if (maxShippingFee > 0) {
      lineItems.push({
        price_data: {
          currency: shippingCurrency,
          product_data: { name: 'Frete' },
          unit_amount: maxShippingFee,
        },
        quantity: 1,
      });
    }

    let totalAmount = dto.items.reduce((sum, item) => {
      const breakdown = costBreakdowns.get(item.productId)!;
      return sum + (breakdown.basePrice + breakdown.chipCostAmount) * item.quantity;
    }, 0) + maxShippingFee;

    // Coupon handling
    let couponValidation: CouponValidationResult | null = null;
    let stripeCouponId: string | undefined;

    if (dto.couponCodes && dto.couponCodes.length > 0) {
      const cartItemsForValidation: CartItemForValidation[] = dto.items.map((item) => {
        const product = products.get(item.productId)!;
        const breakdown = costBreakdowns.get(item.productId)!;
        return {
          productId: item.productId,
          categoryId: product.categoryId ?? null,
          basePrice: breakdown.basePrice,
          quantity: item.quantity,
        };
      });

      couponValidation = await this.validateCouponUseCase.execute(
        tenantId,
        dto.couponCodes,
        cartItemsForValidation,
        'b2b',
      );

      if (couponValidation.totalDiscount > 0) {
        // Atomically claim redemptions before creating Stripe objects
        await this.incrementCouponRedemptions(tenantId, dto.couponCodes);

        const stripe = new Stripe(stripeSecretKey, { apiVersion: STRIPE_API_VERSION });

        try {
          const stripeCoupon = await stripe.coupons.create({
            amount_off: couponValidation.totalDiscount,
            currency: shippingCurrency,
            duration: 'once',
            max_redemptions: 1,
            name: 'Desconto aplicado',
            metadata: {
              tenant_id: tenantId,
              coupon_codes: dto.couponCodes.join(','),
            },
          });
          stripeCouponId = stripeCoupon.id;
          totalAmount -= couponValidation.totalDiscount;
        } catch (err) {
          // Reverse redemption increments if Stripe coupon creation fails
          await this.decrementCouponRedemptions(tenantId, dto.couponCodes);
          throw err;
        }
      }
    }

    const { successUrl, cancelUrl } = await this.billingConfigRepo.getCheckoutUrls(tenantId);
    const stripe = new Stripe(stripeSecretKey, { apiVersion: STRIPE_API_VERSION });

    const metadata: Record<string, string> = {
      tenant_id: tenantId,
      product_ids: dto.items.map((i) => i.productId).join(','),
      product_quantities: dto.items.map((i) => String(i.quantity)).join(','),
      lead_name: dto.leadName,
      lead_email: dto.leadEmail,
      lead_phone: dto.leadPhone,
      total_amount: String(totalAmount),
      shipping_fee: String(maxShippingFee),
    };

    if (userId) {
      metadata.user_id = userId;
      metadata.is_authenticated_purchase = 'true';
    } else {
      metadata.is_lead_purchase = 'true';
    }

    if (stripeCouponId) {
      metadata.stripe_coupon_id = stripeCouponId;
      metadata.coupon_codes = dto.couponCodes!.join(',');
      metadata.discount_amount = String(couponValidation!.totalDiscount);
    }

    const stripeSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      customer_email: dto.leadEmail,
      metadata,
      success_url: successUrl,
      cancel_url: cancelUrl,
      ...(stripeCouponId ? { discounts: [{ coupon: stripeCouponId }] } : {}),
    });

    const firstItem = dto.items[0];
    const firstProduct = products.get(firstItem.productId)!;

    const cartItems = dto.items.map((item) => {
      const product = products.get(item.productId)!;
      const breakdown = costBreakdowns.get(item.productId)!;
      return {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitAmount: breakdown.basePrice,
        chipCostAmount: breakdown.chipCostAmount,
        chipCostPercent: breakdown.chipCostPercent,
        subtotal: (breakdown.basePrice + breakdown.chipCostAmount) * item.quantity,
        currency: product.currency,
      };
    });

    const purchase = await this.purchaseRepo.create({
      tenantId,
      productId: firstProduct.id,
      stripeCheckoutId: stripeSession.id,
      amount: totalAmount,
      currency: firstProduct.currency,
      customerEmail: dto.leadEmail,
      customerName: dto.leadName,
      customerPhone: dto.leadPhone,
      metadata: {
        is_cart_purchase: true,
        cart_items: cartItems,
        cart_item_count: dto.items.length,
        shipping_fee: maxShippingFee,
        ...(couponValidation ? {
          coupon_codes: dto.couponCodes!.join(','),
          discount_amount: couponValidation.totalDiscount,
          stripe_coupon_id: stripeCouponId,
        } : {}),
      },
    });

    return { checkoutUrl: stripeSession.url ?? '', purchaseIds: [purchase.id] };
  }

  private async incrementCouponRedemptions(tenantId: string, codes: string[]): Promise<void> {
    for (const code of codes) {
      const coupon = await this.couponRepo.findByCode(tenantId, code.toUpperCase().trim());
      if (!coupon) continue;
      const ok = await this.couponRepo.incrementRedeemedCount(tenantId, coupon.code, coupon.maxRedemptions);
      if (!ok) {
        throw new ConflictException(`Cupom ${code} foi esgotado`);
      }
    }
  }

  private async decrementCouponRedemptions(tenantId: string, codes: string[]): Promise<void> {
    for (const code of codes) {
      await this.couponRepo.decrementRedeemedCount(tenantId, code.toUpperCase().trim());
    }
  }

  private async resolveProducts(
    tenantId: string,
    productIds: string[],
  ): Promise<Map<string, B2BProductEntity>> {
    const uniqueIds = [...new Set(productIds)];
    const results = await Promise.all(uniqueIds.map((id) => this.productRepo.findById(id, tenantId)));
    const map = new Map<string, B2BProductEntity>();
    for (let i = 0; i < uniqueIds.length; i++) {
      const product = results[i];
      if (!product || !product.isActive()) {
        throw new NotFoundException(`Product not found or inactive: ${uniqueIds[i]}`);
      }
      map.set(uniqueIds[i], product);
    }
    return map;
  }
}
```

- [ ] **Step 8.3: Commit**

```bash
git add src/modules/reserve-b2b-payments/application/dtos/create-cart-checkout.dto.ts \
        src/modules/reserve-b2b-payments/application/use-cases/create-cart-checkout.use-case.ts
git commit -m "feat(coupons): integrate coupon discount into CreateCartCheckoutUseCase"
```

---

## Task 9: Modify CreatePaymentLinkUseCase

**Files:**
- Modify: `src/modules/reserve-b2b-payments/application/dtos/create-payment-link.dto.ts`
- Modify: `src/modules/reserve-b2b-payments/application/use-cases/create-payment-link.use-case.ts`

- [ ] **Step 9.1: Add `couponCodes` to CreatePaymentLinkDTO**

In `src/modules/reserve-b2b-payments/application/dtos/create-payment-link.dto.ts`, add at the end of the class:

```typescript
  @ApiPropertyOptional({
    type: [String],
    example: ['PROMO10'],
    description: 'Códigos de cupom de desconto',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  couponCodes?: string[];
```

Add missing imports at top: `IsArray, IsOptional` alongside the existing imports.

- [ ] **Step 9.2: Rewrite `CreatePaymentLinkUseCase`**

Replace the full contents of `src/modules/reserve-b2b-payments/application/use-cases/create-payment-link.use-case.ts`:

```typescript
import {
  Injectable, Inject, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import Stripe from 'stripe';
import {
  IB2BProductRepository,
  B2B_PRODUCT_REPOSITORY,
} from '../../domain/interfaces/b2b-product.repository.interface';
import {
  IB2BPurchaseRepository,
  B2B_PURCHASE_REPOSITORY,
} from '../../domain/interfaces/b2b-purchase.repository.interface';
import {
  IStripeProvider,
  STRIPE_PROVIDER,
} from '../../../reserve-subscriptions/domain/interfaces/stripe.provider.interface';
import {
  ITenantBillingConfigRepository,
  TENANT_BILLING_CONFIG_REPOSITORY,
} from '../../../reserve-subscriptions/domain/interfaces/tenant-billing-config.repository.interface';
import {
  IDiscountCouponRepository,
  DISCOUNT_COUPON_REPOSITORY,
} from '../../../reserve-coupons/domain/interfaces/discount-coupon.repository.interface';
import { CreatePaymentLinkDTO } from '../dtos/create-payment-link.dto';
import { CalculateB2BOrderCostUseCase } from './calculate-b2b-order-cost.use-case';
import { ValidateCouponUseCase, CartItemForValidation } from '../../../reserve-coupons/application/use-cases/validate-coupon.use-case';

const STRIPE_API_VERSION = '2025-02-24.acacia' as const;

@Injectable()
export class CreatePaymentLinkUseCase {
  constructor(
    @Inject(B2B_PRODUCT_REPOSITORY)
    private readonly productRepo: IB2BProductRepository,
    @Inject(B2B_PURCHASE_REPOSITORY)
    private readonly purchaseRepo: IB2BPurchaseRepository,
    @Inject(STRIPE_PROVIDER)
    private readonly stripeProvider: IStripeProvider,
    @Inject(TENANT_BILLING_CONFIG_REPOSITORY)
    private readonly billingConfigRepo: ITenantBillingConfigRepository,
    @Inject(DISCOUNT_COUPON_REPOSITORY)
    private readonly couponRepo: IDiscountCouponRepository,
    private readonly calculateOrderCostUseCase: CalculateB2BOrderCostUseCase,
    private readonly validateCouponUseCase: ValidateCouponUseCase,
  ) {}

  async execute(
    tenantId: string,
    dto: CreatePaymentLinkDTO,
  ): Promise<{ checkoutUrl: string; purchaseId: string }> {
    const stripeSecretKey = await this.billingConfigRepo.getStripeSecretKey(tenantId);
    if (!stripeSecretKey) {
      throw new BadRequestException('Stripe secret key not configured for this tenant.');
    }

    const product = await this.productRepo.findById(dto.productId, tenantId);
    if (!product || !product.isActive()) {
      throw new NotFoundException('Product not found or inactive');
    }

    const costBreakdown = await this.calculateOrderCostUseCase.execute(tenantId, product.id);

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: product.currency,
          product_data: { name: product.name },
          unit_amount: costBreakdown.basePrice,
        },
        quantity: 1,
      },
    ];

    if (costBreakdown.chipCostAmount > 0) {
      lineItems.push({
        price_data: {
          currency: product.currency,
          product_data: { name: `Taxa de serviço (${costBreakdown.chipCostPercent}%)` },
          unit_amount: costBreakdown.chipCostAmount,
        },
        quantity: 1,
      });
    }

    if (costBreakdown.shippingFee > 0) {
      lineItems.push({
        price_data: {
          currency: product.currency,
          product_data: { name: 'Frete' },
          unit_amount: costBreakdown.shippingFee,
        },
        quantity: 1,
      });
    }

    let totalAmount = costBreakdown.total;
    let stripeCouponId: string | undefined;

    if (dto.couponCodes && dto.couponCodes.length > 0) {
      const cartItemsForValidation: CartItemForValidation[] = [{
        productId: product.id,
        categoryId: product.categoryId ?? null,
        basePrice: costBreakdown.basePrice,
        quantity: 1,
      }];

      const validation = await this.validateCouponUseCase.execute(
        tenantId,
        dto.couponCodes,
        cartItemsForValidation,
        'b2b',
      );

      if (validation.totalDiscount > 0) {
        for (const code of dto.couponCodes) {
          const coupon = await this.couponRepo.findByCode(tenantId, code.toUpperCase().trim());
          if (!coupon) continue;
          const ok = await this.couponRepo.incrementRedeemedCount(tenantId, coupon.code, coupon.maxRedemptions);
          if (!ok) throw new ConflictException(`Cupom ${code} foi esgotado`);
        }

        const stripe = new Stripe(stripeSecretKey, { apiVersion: STRIPE_API_VERSION });
        try {
          const stripeCoupon = await stripe.coupons.create({
            amount_off: validation.totalDiscount,
            currency: product.currency,
            duration: 'once',
            max_redemptions: 1,
            name: 'Desconto aplicado',
            metadata: { tenant_id: tenantId, coupon_codes: dto.couponCodes.join(',') },
          });
          stripeCouponId = stripeCoupon.id;
          totalAmount -= validation.totalDiscount;
        } catch (err) {
          for (const code of dto.couponCodes) {
            await this.couponRepo.decrementRedeemedCount(tenantId, code.toUpperCase().trim());
          }
          throw err;
        }
      }
    }

    const { successUrl, cancelUrl } = await this.billingConfigRepo.getCheckoutUrls(tenantId);
    const stripe = new Stripe(stripeSecretKey, { apiVersion: STRIPE_API_VERSION });

    const stripeSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      customer_email: dto.customerEmail,
      metadata: {
        tenant_id: tenantId,
        product_id: product.id,
        customer_email: dto.customerEmail,
        base_price: String(costBreakdown.basePrice),
        chip_cost_amount: String(costBreakdown.chipCostAmount),
        shipping_fee: String(costBreakdown.shippingFee),
        total_amount: String(totalAmount),
        ...(stripeCouponId ? {
          stripe_coupon_id: stripeCouponId,
          coupon_codes: dto.couponCodes!.join(','),
          discount_amount: String(totalAmount - costBreakdown.total < 0
            ? costBreakdown.total - totalAmount : 0),
        } : {}),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      ...(stripeCouponId ? { discounts: [{ coupon: stripeCouponId }] } : {}),
    });

    const purchase = await this.purchaseRepo.create({
      tenantId,
      productId: product.id,
      stripeCheckoutId: stripeSession.id,
      amount: totalAmount,
      currency: product.currency,
      customerEmail: dto.customerEmail,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
    });

    return { checkoutUrl: stripeSession.url ?? '', purchaseId: purchase.id };
  }
}
```

- [ ] **Step 9.3: Commit**

```bash
git add src/modules/reserve-b2b-payments/application/dtos/create-payment-link.dto.ts \
        src/modules/reserve-b2b-payments/application/use-cases/create-payment-link.use-case.ts
git commit -m "feat(coupons): integrate coupon discount into CreatePaymentLinkUseCase"
```

---

## Task 10: Modify ProcessB2BWebhookUseCase — Stripe Coupon Cleanup

**Files:**
- Modify: `src/modules/reserve-b2b-payments/application/use-cases/process-b2b-webhook.use-case.ts`
- Modify: `src/modules/reserve-b2b-payments/infrastructure/controllers/b2b-webhook.controller.ts`

- [ ] **Step 10.1: Update the webhook controller to pass the Stripe instance**

In `src/modules/reserve-b2b-payments/infrastructure/controllers/b2b-webhook.controller.ts`, change the final block (around line 104):

```typescript
    try {
      await this.processB2BWebhookUseCase.execute(event, stripe);
      return { received: true };
    } catch (error) {
      this.logger.error(`B2B webhook processing failed for event ${event.id}:`, error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Webhook processing failed',
      );
    }
```

(Only the `execute(event)` call changes to `execute(event, stripe)`.)

- [ ] **Step 10.2: Update `ProcessB2BWebhookUseCase` to accept Stripe and clean up coupons**

Replace the full contents of `src/modules/reserve-b2b-payments/application/use-cases/process-b2b-webhook.use-case.ts`:

```typescript
import { Injectable, Inject, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import {
  IB2BPurchaseRepository,
  B2B_PURCHASE_REPOSITORY,
} from '../../domain/interfaces/b2b-purchase.repository.interface';
import {
  IDiscountCouponRepository,
  DISCOUNT_COUPON_REPOSITORY,
} from '../../../reserve-coupons/domain/interfaces/discount-coupon.repository.interface';
import { EPurchaseStatus } from '../../domain/enums/purchase-status.enum';
import { PrismaService } from '../../../../shared/database/prisma.service';

@Injectable()
export class ProcessB2BWebhookUseCase {
  private readonly logger = new Logger(ProcessB2BWebhookUseCase.name);

  constructor(
    @Inject(B2B_PURCHASE_REPOSITORY)
    private readonly purchaseRepo: IB2BPurchaseRepository,
    @Inject(DISCOUNT_COUPON_REPOSITORY)
    private readonly couponRepo: IDiscountCouponRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(event: Stripe.Event, stripe: Stripe): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, stripe);
        break;
      case 'checkout.session.expired':
        await this.handleCheckoutExpired(event.data.object as Stripe.Checkout.Session, stripe);
        break;
      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      default:
        this.logger.log(`Unhandled B2B event type: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session, stripe: Stripe): Promise<void> {
    const tenantId = session.metadata?.tenant_id;
    const checkoutId = session.id;

    if (!tenantId) {
      this.logger.warn(`checkout.session.completed missing tenant_id in metadata: ${checkoutId}`);
      return;
    }

    const customerEmail = session.customer_details?.email ?? session.metadata?.lead_email ?? '';
    const customerName = session.customer_details?.name ?? session.metadata?.lead_name ?? undefined;

    let userId: string | undefined;
    const existingUser = await this.prisma.user.findFirst({
      where: { email: customerEmail },
      select: { id: true },
    });
    userId = existingUser?.id;

    const purchase = await this.purchaseRepo.findByStripeCheckoutId(tenantId, checkoutId);
    if (purchase) {
      await this.purchaseRepo.updateByStripeCheckoutId(tenantId, checkoutId, {
        status: EPurchaseStatus.COMPLETED,
        stripePaymentIntent: (session.payment_intent as string) ?? undefined,
        userId,
        checkoutCompletedAt: new Date(),
      });
      this.logger.log(`B2B purchase completed: ${purchase.id} (tenant: ${tenantId}, email: ${customerEmail})`);
    }

    // Archive Stripe coupon if one was created for this session
    const stripeCouponId = session.metadata?.stripe_coupon_id;
    if (stripeCouponId) {
      try {
        await stripe.coupons.del(stripeCouponId);
        this.logger.log(`Archived Stripe coupon ${stripeCouponId} after completed checkout ${checkoutId}`);
      } catch (err) {
        this.logger.warn(`Could not archive Stripe coupon ${stripeCouponId}: ${err}`);
      }
    }

    const b2cPriceIds = session.metadata?.b2c_price_ids?.split(',').filter(Boolean) ?? [];
    if (b2cPriceIds.length > 0) {
      await this.grantUnifiedB2CAccess(session, tenantId, b2cPriceIds, userId, customerEmail, customerName);
    } else if (!purchase) {
      this.logger.warn(`No B2B purchase and no B2C price IDs for checkout ${checkoutId} — nothing to process`);
    }
  }

  private async handleCheckoutExpired(session: Stripe.Checkout.Session, stripe: Stripe): Promise<void> {
    const tenantId = session.metadata?.tenant_id;
    if (!tenantId) return;

    const purchase = await this.purchaseRepo.findByStripeCheckoutId(tenantId, session.id);
    if (purchase) {
      await this.purchaseRepo.updateByStripeCheckoutId(tenantId, session.id, {
        status: EPurchaseStatus.ABANDONED,
        checkoutAbandonedAt: new Date(),
      });
    }

    // Archive Stripe coupon and reverse redemption counts
    const stripeCouponId = session.metadata?.stripe_coupon_id;
    if (stripeCouponId) {
      try {
        await stripe.coupons.del(stripeCouponId);
        this.logger.log(`Archived Stripe coupon ${stripeCouponId} after expired checkout ${session.id}`);
      } catch (err) {
        this.logger.warn(`Could not archive Stripe coupon ${stripeCouponId}: ${err}`);
      }

      // Reverse redemption counts for each coupon code
      const couponCodesRaw = session.metadata?.coupon_codes;
      if (couponCodesRaw) {
        const codes = couponCodesRaw.split(',').map((c: string) => c.trim()).filter(Boolean);
        for (const code of codes) {
          await this.couponRepo.decrementRedeemedCount(tenantId, code);
        }
        this.logger.log(`Reversed redemption counts for coupons [${codes.join(', ')}] after expired session ${session.id}`);
      }
    }

    try {
      await this.prisma.b2CCheckoutSession.updateMany({
        where: { stripe_checkout_id: session.id, tenant_id: tenantId },
        data: { status: 'abandoned', checkout_expired_at: new Date() },
      });
    } catch {
      // Non-critical — only exists for unified carts with B2C items
    }

    this.logger.log(`B2B checkout abandoned: ${session.id} (tenant: ${tenantId})`);
  }

  private async grantUnifiedB2CAccess(
    session: Stripe.Checkout.Session,
    tenantId: string,
    b2cPriceIds: string[],
    userId: string | undefined,
    customerEmail: string,
    customerName: string | undefined,
  ): Promise<void> {
    const customerId = session.customer as string;

    let resolvedUserId = userId;
    if (!resolvedUserId && customerEmail) {
      const existing = await this.prisma.user.findFirst({
        where: { email: customerEmail },
        select: { id: true },
      });

      if (existing) {
        resolvedUserId = existing.id;
      } else {
        const freePlan = await this.prisma.plan.findFirst({
          where: { slug: process.env.FREE_PLAN_SLUG ?? 'free' },
          select: { id: true },
        });

        if (freePlan) {
          const newUser = await this.prisma.user.create({
            data: {
              email: customerEmail,
              name: customerName ?? 'Lead',
              cpf: '',
              phone_number: session.metadata?.lead_phone ?? '',
              plan_id: freePlan.id,
              stripe_customer_id: customerId ?? '',
            },
          });
          resolvedUserId = newUser.id;
          this.logger.log(`Created user from unified cart lead: ${resolvedUserId} (${customerEmail})`);
        }
      }
    }

    if (!resolvedUserId) {
      this.logger.warn(`Could not resolve userId for B2C access in unified cart ${session.id}`);
      return;
    }

    const prices = await this.prisma.productPrice.findMany({
      where: { id: { in: b2cPriceIds }, tenant_id: tenantId },
      select: {
        id: true, product_id: true, billing_mode: true,
        access_duration_days: true, unit_amount: true, currency: true,
      },
    });

    for (const price of prices) {
      const billingMode = price.billing_mode as string;
      const isOneTimeExp = billingMode === 'one_time_exp';
      const accessType = isOneTimeExp ? 'temporary' : 'lifetime';
      const expiresAt = isOneTimeExp && price.access_duration_days
        ? new Date(Date.now() + price.access_duration_days * 24 * 60 * 60 * 1000)
        : null;

      try {
        await this.prisma.userProductAccess.create({
          data: {
            tenant_id: tenantId,
            user_id: resolvedUserId,
            product_id: price.product_id,
            product_price_id: price.id,
            stripe_customer_id: customerId ?? '',
            stripe_price_id: price.id,
            stripe_payment_intent_id: (session.payment_intent as string) ?? '',
            access_type: accessType,
            status: 'active',
            access_granted_at: new Date(),
            access_expires_at: expiresAt,
            completed_billing_cycles: 0,
            amount: price.unit_amount,
            currency: price.currency,
            cancel_at_period_end: false,
          },
        });
        this.logger.log(`B2C access granted: user=${resolvedUserId} product=${price.product_id} mode=${billingMode}`);
      } catch (err) {
        this.logger.error(`Failed to grant B2C access for price ${price.id}: ${err}`);
      }
    }

    try {
      await this.prisma.b2CCheckoutSession.updateMany({
        where: { stripe_checkout_id: session.id, tenant_id: tenantId },
        data: { status: 'completed', checkout_completed_at: new Date() },
      });
    } catch (err) {
      this.logger.warn(`Could not update B2CCheckoutSession for unified cart ${session.id}: ${err}`);
    }
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    const tenantId = charge.metadata?.tenant_id;
    if (!tenantId || !charge.payment_intent) return;

    const purchases = await this.prisma.b2BPurchase.findMany({
      where: { tenant_id: tenantId, stripe_payment_intent: charge.payment_intent as string },
      select: { stripe_checkout_id: true },
    });

    for (const p of purchases) {
      if (p.stripe_checkout_id) {
        await this.purchaseRepo.updateByStripeCheckoutId(tenantId, p.stripe_checkout_id, {
          status: EPurchaseStatus.REFUNDED,
        });
      }
    }

    this.logger.log(`B2B charge refunded for payment_intent: ${charge.payment_intent}`);
  }
}
```

- [ ] **Step 10.3: Commit**

```bash
git add src/modules/reserve-b2b-payments/application/use-cases/process-b2b-webhook.use-case.ts \
        src/modules/reserve-b2b-payments/infrastructure/controllers/b2b-webhook.controller.ts
git commit -m "feat(coupons): archive Stripe coupon and reverse redemptions on webhook events"
```

---

## Task 11: Wire Up Modules

**Files:**
- Modify: `src/modules/reserve-b2b-payments/reserve-b2b-payments.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 11.1: Update `ReserveB2bPaymentsModule`**

Replace the full contents of `src/modules/reserve-b2b-payments/reserve-b2b-payments.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { ReserveAuthModule } from '../reserve-auth/reserve-auth.module';
import { ReserveSubscriptionsModule } from '../reserve-subscriptions/reserve-subscriptions.module';
import { ReserveB2cProductsModule } from '../reserve-b2c-products/reserve-b2c-products.module';
import { ReserveCouponsModule } from '../reserve-coupons/reserve-coupons.module';

import { B2BPaymentsController } from './infrastructure/controllers/b2b-payments.controller';
import { B2BWebhookController } from './infrastructure/controllers/b2b-webhook.controller';
import { PublicB2BProductsController, PublicB2BCartController } from './infrastructure/controllers/public-b2b-products.controller';
import { AdminB2BFeesController } from './infrastructure/controllers/admin-b2b-fees.controller';

import { CreateB2BProductUseCase } from './application/use-cases/create-b2b-product.use-case';
import { ListB2BProductsUseCase } from './application/use-cases/list-b2b-products.use-case';
import { CreatePaymentLinkUseCase } from './application/use-cases/create-payment-link.use-case';
import { CreateLeadCheckoutUseCase } from './application/use-cases/create-lead-checkout.use-case';
import { CreateCartCheckoutUseCase } from './application/use-cases/create-cart-checkout.use-case';
import { ListPurchasesUseCase } from './application/use-cases/list-purchases.use-case';
import { GetMetricsUseCase } from './application/use-cases/get-metrics.use-case';
import { ProcessB2BWebhookUseCase } from './application/use-cases/process-b2b-webhook.use-case';
import { CalculateB2BOrderCostUseCase } from './application/use-cases/calculate-b2b-order-cost.use-case';
import { ManageB2BProductFeesUseCase } from './application/use-cases/manage-b2b-product-fees.use-case';

import { PrismaB2BProductRepository } from './infrastructure/repositories/prisma-b2b-product.repository';
import { PrismaB2BPurchaseRepository } from './infrastructure/repositories/prisma-b2b-purchase.repository';
import { PrismaB2BFeeConfigRepository } from './infrastructure/repositories/prisma-b2b-fee-config.repository';
import { B2B_PRODUCT_REPOSITORY } from './domain/interfaces/b2b-product.repository.interface';
import { B2B_PURCHASE_REPOSITORY } from './domain/interfaces/b2b-purchase.repository.interface';
import { B2B_FEE_CONFIG_REPOSITORY } from './domain/interfaces/b2b-fee-config.repository.interface';

import { StripeProvider } from '../reserve-subscriptions/infrastructure/providers/stripe.provider';
import { STRIPE_PROVIDER } from '../reserve-subscriptions/domain/interfaces/stripe.provider.interface';

import { OptionalUserGuard } from './infrastructure/guards/optional-user.guard';

@Module({
  imports: [DatabaseModule, ReserveAuthModule, ReserveSubscriptionsModule, ReserveB2cProductsModule, ReserveCouponsModule],
  controllers: [
    B2BPaymentsController,
    B2BWebhookController,
    PublicB2BProductsController,
    PublicB2BCartController,
    AdminB2BFeesController,
  ],
  providers: [
    CreateB2BProductUseCase,
    ListB2BProductsUseCase,
    CreatePaymentLinkUseCase,
    CreateLeadCheckoutUseCase,
    CreateCartCheckoutUseCase,
    ListPurchasesUseCase,
    GetMetricsUseCase,
    ProcessB2BWebhookUseCase,
    CalculateB2BOrderCostUseCase,
    ManageB2BProductFeesUseCase,
    OptionalUserGuard,
    { provide: B2B_PRODUCT_REPOSITORY, useClass: PrismaB2BProductRepository },
    { provide: B2B_PURCHASE_REPOSITORY, useClass: PrismaB2BPurchaseRepository },
    { provide: B2B_FEE_CONFIG_REPOSITORY, useClass: PrismaB2BFeeConfigRepository },
    { provide: STRIPE_PROVIDER, useClass: StripeProvider },
  ],
  exports: [ProcessB2BWebhookUseCase],
})
export class ReserveB2bPaymentsModule {}
```

- [ ] **Step 11.2: Register `ReserveCouponsModule` in `AppModule`**

In `src/app.module.ts`, add the import:

```typescript
import { ReserveCouponsModule } from './modules/reserve-coupons/reserve-coupons.module';
```

And add `ReserveCouponsModule` to the `imports` array (after `ReserveB2bPaymentsModule`):

```typescript
    ReserveCouponsModule,
```

- [ ] **Step 11.3: Build to verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 11.4: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all existing tests pass + the 12 new coupon tests pass.

- [ ] **Step 11.5: Commit**

```bash
git add src/modules/reserve-b2b-payments/reserve-b2b-payments.module.ts \
        src/app.module.ts
git commit -m "feat(coupons): wire ReserveCouponsModule into AppModule and ReserveB2bPaymentsModule"
```

---

## Self-Review Checklist

- [x] **Prisma schema** → Task 1
- [x] **DiscountCouponEntity + enums** → Task 2
- [x] **Repository interface** → Task 2
- [x] **ValidateCouponUseCase with all scope/type/cumulative/cap/context logic** → Task 4
- [x] **Tests for all validation paths** → Task 4
- [x] **Admin CRUD use cases** → Task 5
- [x] **Prisma repository with atomic increment/decrement** → Task 6
- [x] **Admin + Public controllers** → Task 7
- [x] **Rate limiting on public endpoint** → Task 7
- [x] **CreateCartCheckoutDTO couponCodes field** → Task 8
- [x] **CreateCartCheckoutUseCase: validate, create Stripe coupon, apply to session, store metadata, atomic increment, compensating decrement on failure** → Task 8
- [x] **CreatePaymentLinkDTO + UseCase** → Task 9
- [x] **ProcessB2BWebhookUseCase: archive Stripe coupon on completed + expired, reverse redemptions on expired** → Task 10
- [x] **Module wiring + AppModule registration** → Task 11
- [x] **Server-side re-validation** → ValidateCouponUseCase called inside checkout use cases (not trusted from client)
- [x] **Tenant isolation** → all repo queries filter by tenantId
- [x] **Generic error messages on public endpoint** → `"Cupom inválido"` (no leak of reason)
