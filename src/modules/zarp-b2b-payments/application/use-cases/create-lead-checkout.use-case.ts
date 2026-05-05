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

const STRIPE_API_VERSION = '2025-02-24.acacia' as const;

/**
 * Use case para criar checkout de produto B2B.
 * 
 * Suporta 2 cenários:
 * 1. Lead não autenticado: Captura dados básicos e cria checkout
 * 2. User autenticado: Vincula compra ao user existente
 * 
 * Fluxo Lead:
 * 1. Lead preenche modal com nome, email e telefone
 * 2. Sistema cria registro de purchase com status "pending"
 * 3. Redireciona para Stripe Checkout
 * 4. Se comprar → webhook converte lead em user
 * 5. Se abandonar → lead fica registrado para remarketing
 * 
 * Fluxo User:
 * 1. User já logado clica em comprar
 * 2. Sistema cria purchase vinculado ao userId
 * 3. Redireciona para Stripe Checkout
 * 4. Se comprar → webhook atualiza purchase
 */
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
  ) {}

  async execute(
    tenantId: string,
    dto: CreateLeadCheckoutDTO,
    userId?: string, // Opcional: se vier do OptionalUserGuard
  ): Promise<{ checkoutUrl: string; purchaseId: string }> {
    // 1. Get tenant's Stripe secret key
    const stripeSecretKey = await this.billingConfigRepo.getStripeSecretKey(tenantId);
    if (!stripeSecretKey) {
      throw new BadRequestException(
        'Stripe not configured for this tenant. Please contact support.',
      );
    }

    // 2. Validate product belongs to tenant and is active
    const product = await this.productRepo.findById(dto.productId, tenantId);
    if (!product || !product.isActive()) {
      throw new NotFoundException('Product not found or inactive');
    }

    const { successUrl, cancelUrl } = await this.billingConfigRepo.getCheckoutUrls(tenantId);

    // 3. Create Stripe Checkout Session
    const stripe = new Stripe(stripeSecretKey, { apiVersion: STRIPE_API_VERSION });
    
    const metadata: Record<string, string> = {
      tenant_id: tenantId,
      product_id: product.id,
      lead_name: dto.leadName,
      lead_email: dto.leadEmail,
      lead_phone: dto.leadPhone,
    };

    if (userId) {
      metadata.user_id = userId;
      metadata.is_authenticated_purchase = 'true';
    } else {
      metadata.is_lead_purchase = 'true';
    }

    const stripeSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: product.stripePriceId, quantity: 1 }],
      customer_email: dto.leadEmail,
      metadata,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    // 4. Create purchase record (status: pending)
    // Se lead abandonar, fica registrado para remarketing
    const purchase = await this.purchaseRepo.create({
      tenantId,
      productId: product.id,
      stripeCheckoutId: stripeSession.id,
      amount: product.price,
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
