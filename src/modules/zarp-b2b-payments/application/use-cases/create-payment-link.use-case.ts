import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
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
} from '../../../zarp-subscriptions/domain/interfaces/stripe.provider.interface';
import {
  ITenantBillingConfigRepository,
  TENANT_BILLING_CONFIG_REPOSITORY,
} from '../../../zarp-subscriptions/domain/interfaces/tenant-billing-config.repository.interface';
import { EPurchaseStatus } from '../../domain/enums/purchase-status.enum';
import { CreatePaymentLinkDTO } from '../dtos/create-payment-link.dto';
import { CalculateB2BOrderCostUseCase } from './calculate-b2b-order-cost.use-case';

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
    private readonly calculateOrderCostUseCase: CalculateB2BOrderCostUseCase,
  ) {}

  async execute(
    tenantId: string,
    dto: CreatePaymentLinkDTO,
  ): Promise<{ checkoutUrl: string; purchaseId: string }> {
    // 1. Get tenant's Stripe secret key
    const stripeSecretKey = await this.billingConfigRepo.getStripeSecretKey(tenantId);
    if (!stripeSecretKey) {
      throw new BadRequestException(
        'Stripe secret key not configured for this tenant. Configure it via billing config.',
      );
    }

    // 2. Validate product belongs to tenant
    const product = await this.productRepo.findById(dto.productId, tenantId);
    if (!product || !product.isActive()) {
      throw new NotFoundException('Product not found or inactive');
    }

    // 3. Calculate total with fees (chip cost % + shipping fee)
    const costBreakdown = await this.calculateOrderCostUseCase.execute(tenantId, product.id);

    // 4. Build line_items with fee breakdown
    // Each fee is a separate line item for transparency on the Stripe checkout page
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

    // 5. Create Stripe Checkout Session with calculated line_items
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
        total_amount: String(costBreakdown.total),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    // 6. Create purchase record with total amount (including fees)
    const purchase = await this.purchaseRepo.create({
      tenantId,
      productId: product.id,
      stripeCheckoutId: stripeSession.id,
      amount: costBreakdown.total,
      currency: product.currency,
      customerEmail: dto.customerEmail,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
    });

    return {
      checkoutUrl: stripeSession.url ?? '',
      purchaseId: purchase.id,
    };
  }
}
