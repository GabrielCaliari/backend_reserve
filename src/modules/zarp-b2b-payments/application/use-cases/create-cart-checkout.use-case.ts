import { Injectable, Inject, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
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
} from '../../../zarp-subscriptions/domain/interfaces/tenant-billing-config.repository.interface';
import { B2BProductEntity } from '../../domain/entities/b2b-product.entity';
import { CreateCartCheckoutDTO } from '../dtos/create-cart-checkout.dto';
import { CalculateB2BOrderCostUseCase } from './calculate-b2b-order-cost.use-case';
import { OrderCostBreakdown } from '../../../zarp-b2c-products/application/use-cases/resolve-product-fees.use-case';
import { ValidateCouponUseCase } from '../../../zarp-coupons/application/use-cases/validate-coupon.use-case';
import {
  IDiscountCouponRepository,
  DISCOUNT_COUPON_REPOSITORY,
} from '../../../zarp-coupons/domain/interfaces/discount-coupon.repository.interface';

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
    private readonly calculateOrderCostUseCase: CalculateB2BOrderCostUseCase,
    private readonly validateCouponUseCase: ValidateCouponUseCase,
    @Inject(DISCOUNT_COUPON_REPOSITORY)
    private readonly couponRepo: IDiscountCouponRepository,
  ) {}

  async execute(
    tenantId: string,
    dto: CreateCartCheckoutDTO,
    userId?: string,
  ): Promise<{ checkoutUrl: string; purchaseIds: string[] }> {
    // 1. Get tenant's Stripe secret key
    const stripeSecretKey = await this.billingConfigRepo.getStripeSecretKey(tenantId);
    if (!stripeSecretKey) {
      throw new BadRequestException(
        'Stripe not configured for this tenant. Please contact support.',
      );
    }

    // 2. Validate all products and calculate fees for each
    const products = await this.resolveProducts(tenantId, dto.items.map((i) => i.productId));

    const costBreakdowns = new Map<string, OrderCostBreakdown>();
    for (const [productId] of products) {
      const breakdown = await this.calculateOrderCostUseCase.execute(tenantId, productId);
      costBreakdowns.set(productId, breakdown);
    }

    // 3. Build Stripe line_items with fees per product
    // Shipping fee: cobrado uma vez por pedido (o maior entre os produtos físicos)
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    let maxShippingFee = 0;
    let shippingCurrency = 'brl';

    for (const item of dto.items) {
      const product = products.get(item.productId)!;
      const breakdown = costBreakdowns.get(item.productId)!;

      // Produto base
      lineItems.push({
        price_data: {
          currency: product.currency,
          product_data: { name: product.name },
          unit_amount: breakdown.basePrice,
        },
        quantity: item.quantity,
      });

      // Chip cost por produto (se houver)
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

      // Rastreia o maior frete entre produtos físicos
      if (breakdown.shippingFee > maxShippingFee) {
        maxShippingFee = breakdown.shippingFee;
        shippingCurrency = product.currency;
      }
    }

    // Frete único por pedido (o maior valor)
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

    // 4. Calculate total amount for purchase record (before coupons)
    const totalAmountBeforeDiscount = dto.items.reduce((sum, item) => {
      const breakdown = costBreakdowns.get(item.productId)!;
      return sum + (breakdown.basePrice + breakdown.chipCostAmount) * item.quantity;
    }, 0) + maxShippingFee;

    // 4b. Validate and apply coupon codes (if provided)
    let totalDiscount = 0;
    let stripeCouponId: string | undefined;
    const couponCodes = dto.couponCodes?.filter(Boolean) ?? [];

    // Stripe client needed here to create coupon before the session
    const stripe = new Stripe(stripeSecretKey, { apiVersion: STRIPE_API_VERSION });

    if (couponCodes.length > 0) {
      const cartItemsForValidation = dto.items.map((item) => {
        const breakdown = costBreakdowns.get(item.productId)!;
        return {
          productId: item.productId,
          basePrice: breakdown.basePrice,
          quantity: item.quantity,
          // B2B products are always one-time purchases, never recurring subscriptions
          isRecurring: false,
          itemType: 'b2b' as const,
        };
      });

      const validationResult = await this.validateCouponUseCase.execute(
        tenantId, couponCodes, cartItemsForValidation, 'b2b',
      );
      totalDiscount = validationResult.totalDiscount;

      if (totalDiscount > 0) {
        // Claim redemptions atomically before creating the Stripe session
        for (const { code } of validationResult.coupons) {
          const coupon = await this.couponRepo.findByCode(tenantId, code);
          const claimed = await this.couponRepo.incrementRedeemedCount(
            tenantId, code, coupon?.maxRedemptions ?? null,
          );
          if (!claimed) {
            throw new ConflictException(`Cupom esgotado: ${code}`);
          }
        }

        // Create a Stripe Coupon and apply via discounts[] — this renders visually
        // on the Stripe Checkout page. Negative unit_amount is NOT supported by Stripe.
        const firstProduct = products.get(dto.items[0].productId)!;
        const stripeCoupon = await stripe.coupons.create({
          amount_off: totalDiscount,
          currency: firstProduct.currency,
          duration: 'once',
          max_redemptions: 1,
          name: `Desconto (${couponCodes.join(', ')})`,
          metadata: { tenant_id: tenantId, coupon_codes: couponCodes.join(',') },
        });
        stripeCouponId = stripeCoupon.id;
      }
    }

    const totalAmount = totalAmountBeforeDiscount - totalDiscount;

    // 5. Build metadata
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

    if (couponCodes.length > 0) {
      metadata.coupon_codes = couponCodes.join(',');
      metadata.discount_amount = String(totalDiscount);
    }

    if (stripeCouponId) {
      metadata.stripe_coupon_id = stripeCouponId;
    }

    if (userId) {
      metadata.user_id = userId;
      metadata.is_authenticated_purchase = 'true';
    } else {
      metadata.is_lead_purchase = 'true';
    }

    // 6. Create Stripe Checkout Session
    const { successUrl, cancelUrl } = await this.billingConfigRepo.getCheckoutUrls(tenantId);

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

    // 7. Create purchase record
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
      },
    });

    return {
      checkoutUrl: stripeSession.url ?? '',
      purchaseIds: [purchase.id],
    };
  }

  private async resolveProducts(
    tenantId: string,
    productIds: string[],
  ): Promise<Map<string, B2BProductEntity>> {
    const uniqueIds = [...new Set(productIds)];
    const results = await Promise.all(
      uniqueIds.map((id) => this.productRepo.findById(id, tenantId)),
    );

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
