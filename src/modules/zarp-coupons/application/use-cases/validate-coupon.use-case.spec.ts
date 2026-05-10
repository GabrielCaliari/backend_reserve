import { Test, TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';
import { ValidateCouponUseCase, CartItemForValidation } from './validate-coupon.use-case';
import { DISCOUNT_COUPON_REPOSITORY } from '../../domain/interfaces/discount-coupon.repository.interface';
import { DiscountCouponEntity } from '../../domain/entities/discount-coupon.entity';
import { EDiscountType } from '../../domain/enums/discount-type.enum';
import { ECouponScope } from '../../domain/enums/coupon-scope.enum';
import { ECouponAppliesTo } from '../../domain/enums/coupon-applies-to.enum';

const makeCoupon = (
  overrides: Partial<{
    id: string;
    tenantId: string;
    code: string;
    name: string;
    description: string | null;
    discountType: EDiscountType;
    discountValue: number;
    scope: ECouponScope;
    productIds: string[];
    categoryIds: string[];
    appliesTo: ECouponAppliesTo;
    cumulative: boolean;
    minOrderAmount: number | null;
    maxDiscountAmount: number | null;
    maxRedemptions: number | null;
    redeemedCount: number;
    expiresAt: Date | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
): DiscountCouponEntity => {
  const d = {
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
    ...overrides,
  };
  return new DiscountCouponEntity(
    d.id,
    d.tenantId,
    d.code,
    d.name,
    d.description,
    d.discountType,
    d.discountValue,
    d.scope,
    d.productIds,
    d.categoryIds,
    d.appliesTo,
    d.cumulative,
    d.minOrderAmount,
    d.maxDiscountAmount,
    d.maxRedemptions,
    d.redeemedCount,
    d.expiresAt,
    d.active,
    d.createdAt,
    d.updatedAt,
  );
};

const cartItems: CartItemForValidation[] = [
  { productId: 'prod_1', categoryId: 'cat_1', basePrice: 10000, quantity: 2 },
  { productId: 'prod_2', categoryId: 'cat_2', basePrice: 5000, quantity: 1 },
];

const mockRepo = { findByCode: jest.fn() };

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

  it('applies 10% discount to full cart total', async () => {
    mockRepo.findByCode.mockResolvedValue(makeCoupon());
    const result = await useCase.execute('tenant_1', ['PROMO10'], cartItems, 'b2b');
    // cartTotal = 10000*2 + 5000*1 = 25000; 10% = 2500
    expect(result.totalDiscount).toBe(2500);
    expect(result.finalTotal).toBe(22500);
    expect(result.coupons[0].code).toBe('PROMO10');
  });

  it('scope=product applies only to eligible products', async () => {
    mockRepo.findByCode.mockResolvedValue(
      makeCoupon({ scope: ECouponScope.PRODUCT, productIds: ['prod_1'], discountValue: 50 }),
    );
    const result = await useCase.execute('tenant_1', ['PROMO10'], cartItems, 'b2b');
    // eligible = 10000*2 = 20000; 50% = 10000
    expect(result.totalDiscount).toBe(10000);
    expect(result.finalTotal).toBe(15000);
  });

  it('scope=category applies only to items in eligible category', async () => {
    mockRepo.findByCode.mockResolvedValue(
      makeCoupon({
        scope: ECouponScope.CATEGORY,
        categoryIds: ['cat_2'],
        discountType: EDiscountType.FIXED_AMOUNT,
        discountValue: 2000,
      }),
    );
    const result = await useCase.execute('tenant_1', ['PROMO10'], cartItems, 'b2b');
    // eligible = 5000*1 = 5000; fixed 2000 <= 5000
    expect(result.totalDiscount).toBe(2000);
    expect(result.finalTotal).toBe(23000);
  });

  it('caps discount at maxDiscountAmount', async () => {
    mockRepo.findByCode.mockResolvedValue(makeCoupon({ maxDiscountAmount: 1000 }));
    const result = await useCase.execute('tenant_1', ['PROMO10'], cartItems, 'b2b');
    // 10% of 25000 = 2500, capped at 1000
    expect(result.totalDiscount).toBe(1000);
  });

  it('throws when cart total is below minOrderAmount', async () => {
    mockRepo.findByCode.mockResolvedValue(makeCoupon({ minOrderAmount: 50000 }));
    await expect(useCase.execute('tenant_1', ['PROMO10'], cartItems, 'b2b')).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('throws when second coupon conflicts with non-cumulative first', async () => {
    mockRepo.findByCode
      .mockResolvedValueOnce(makeCoupon({ code: 'A', cumulative: false }))
      .mockResolvedValueOnce(makeCoupon({ code: 'B', cumulative: true }));
    await expect(useCase.execute('tenant_1', ['A', 'B'], cartItems, 'b2b')).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('stacks two cumulative coupons', async () => {
    mockRepo.findByCode
      .mockResolvedValueOnce(makeCoupon({ code: 'A', discountValue: 10, cumulative: true }))
      .mockResolvedValueOnce(makeCoupon({ code: 'B', discountValue: 5, cumulative: true }));
    const result = await useCase.execute('tenant_1', ['A', 'B'], cartItems, 'b2b');
    // 10% + 5% of 25000 = 2500 + 1250 = 3750
    expect(result.totalDiscount).toBe(3750);
  });

  it('throws when coupon not found', async () => {
    mockRepo.findByCode.mockResolvedValue(null);
    await expect(useCase.execute('tenant_1', ['NOTEXIST'], cartItems, 'b2b')).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('throws when coupon is inactive', async () => {
    mockRepo.findByCode.mockResolvedValue(makeCoupon({ active: false }));
    await expect(useCase.execute('tenant_1', ['PROMO10'], cartItems, 'b2b')).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('throws when coupon is expired', async () => {
    mockRepo.findByCode.mockResolvedValue(
      makeCoupon({ expiresAt: new Date(Date.now() - 1000) }),
    );
    await expect(useCase.execute('tenant_1', ['PROMO10'], cartItems, 'b2b')).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('throws when max redemptions exhausted', async () => {
    mockRepo.findByCode.mockResolvedValue(
      makeCoupon({ maxRedemptions: 5, redeemedCount: 5 }),
    );
    await expect(useCase.execute('tenant_1', ['PROMO10'], cartItems, 'b2b')).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('throws when coupon does not apply to context', async () => {
    mockRepo.findByCode.mockResolvedValue(makeCoupon({ appliesTo: ECouponAppliesTo.B2C }));
    await expect(useCase.execute('tenant_1', ['PROMO10'], cartItems, 'b2b')).rejects.toThrow(
      UnprocessableEntityException,
    );
  });
});
