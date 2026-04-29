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

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

    // 3. Create Stripe Checkout Session (one-time payment mode) using tenant's key
    const stripe = new Stripe(stripeSecretKey, { apiVersion: STRIPE_API_VERSION });
    const stripeSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: product.stripePriceId, quantity: 1 }],
      customer_email: dto.customerEmail,
      metadata: {
        tenant_id: tenantId,
        product_id: product.id,
        customer_email: dto.customerEmail,
      },
      success_url: `${frontendUrl}/b2b/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/b2b/cancel`,
    });

    // 4. Create purchase record
    const purchase = await this.purchaseRepo.create({
      tenantId,
      productId: product.id,
      stripeCheckoutId: stripeSession.id,
      amount: product.price,
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
