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
import { CreateLeadCheckoutDTO } from '../dtos/create-lead-checkout.dto';
import { CalculateB2BOrderCostUseCase } from './calculate-b2b-order-cost.use-case';

const STRIPE_API_VERSION = '2025-02-24.acacia' as const;

@Injectable()
export class CreateLeadCheckoutUseCase {
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
    dto: CreateLeadCheckoutDTO,
    userId?: string,
  ): Promise<{ checkoutUrl: string; purchaseId: string }> {
    // 1. Get tenant's Stripe secret key
    const stripeSecretKey = await this.billingConfigRepo.getStripeSecretKey(tenantId);
    if (!stripeSecretKey) {
      throw new BadRequestException(
        'Stripe not configured for this tenant. Please contact support.',
      );
    }

    // 2. Validate product
    const product = await this.productRepo.findById(dto.productId, tenantId);
    if (!product || !product.isActive()) {
      throw new NotFoundException('Product not found or inactive');
    }

    // 3. Calculate total with fees
    const costBreakdown = await this.calculateOrderCostUseCase.execute(tenantId, product.id);

    // 4. Build line_items with fee breakdown
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

    // 5. Build metadata
    const metadata: Record<string, string> = {
      tenant_id: tenantId,
      product_id: product.id,
      lead_name: dto.leadName,
      lead_email: dto.leadEmail,
      lead_phone: dto.leadPhone,
      base_price: String(costBreakdown.basePrice),
      chip_cost_amount: String(costBreakdown.chipCostAmount),
      shipping_fee: String(costBreakdown.shippingFee),
      total_amount: String(costBreakdown.total),
    };

    if (userId) {
      metadata.user_id = userId;
      metadata.is_authenticated_purchase = 'true';
    } else {
      metadata.is_lead_purchase = 'true';
    }

    // 6. Create Stripe Checkout Session
    const { successUrl, cancelUrl } = await this.billingConfigRepo.getCheckoutUrls(tenantId);
    const stripe = new Stripe(stripeSecretKey, { apiVersion: STRIPE_API_VERSION });

    const stripeSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      customer_email: dto.leadEmail,
      metadata,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    // 7. Create purchase record with total amount (including fees)
    const purchase = await this.purchaseRepo.create({
      tenantId,
      productId: product.id,
      stripeCheckoutId: stripeSession.id,
      amount: costBreakdown.total,
      currency: product.currency,
      customerEmail: dto.leadEmail,
      customerName: dto.leadName,
      customerPhone: dto.leadPhone,
    });

    return {
      checkoutUrl: stripeSession.url ?? '',
      purchaseId: purchase.id,
    };
  }
}
