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
  ITenantBillingConfigRepository,
  TENANT_BILLING_CONFIG_REPOSITORY,
} from '../../../zarp-subscriptions/domain/interfaces/tenant-billing-config.repository.interface';
import { B2BProductEntity } from '../../domain/entities/b2b-product.entity';
import { CreateCartCheckoutDTO } from '../dtos/create-cart-checkout.dto';

const STRIPE_API_VERSION = '2025-02-24.acacia' as const;

/**
 * Use case para criar checkout de carrinho B2B com múltiplos produtos.
 *
 * Suporta 2 cenários:
 * - Lead não autenticado: captura dados via modal, cria purchase por item
 * - User autenticado: vincula purchases ao userId existente
 *
 * Uma única Stripe Checkout Session é criada com todos os line_items.
 * Um B2BPurchase é criado por item para rastreamento granular.
 * O stripeCheckoutId é compartilhado entre todos os purchases do mesmo carrinho.
 *
 * Remarketing: se o lead abandonar, todos os purchases ficam com status "pending"
 * e os dados do lead ficam salvos para campanhas de carrinho abandonado.
 */
@Injectable()
export class CreateCartCheckoutUseCase {
  constructor(
    @Inject(B2B_PRODUCT_REPOSITORY)
    private readonly productRepo: IB2BProductRepository,
    @Inject(B2B_PURCHASE_REPOSITORY)
    private readonly purchaseRepo: IB2BPurchaseRepository,
    @Inject(TENANT_BILLING_CONFIG_REPOSITORY)
    private readonly billingConfigRepo: ITenantBillingConfigRepository,
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

    // 2. Validate all products exist and are active
    const products = await this.resolveProducts(tenantId, dto.items.map((i) => i.productId));

    // 3. Build Stripe line_items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = dto.items.map((item) => {
      const product = products.get(item.productId)!;
      return { price: product.stripePriceId, quantity: item.quantity };
    });

    // 4. Build metadata
    const metadata: Record<string, string> = {
      tenant_id: tenantId,
      // Serializa os IDs dos produtos para o webhook conseguir processar cada um
      product_ids: dto.items.map((i) => i.productId).join(','),
      product_quantities: dto.items.map((i) => String(i.quantity)).join(','),
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

    // 5. Create single Stripe Checkout Session with all line items
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

    // 6. Create a single B2BPurchase representing the entire cart
    // Uses the first product as the "primary" product_id (required by schema).
    // All items are stored in metadata for webhook processing and remarketing.
    const firstItem = dto.items[0];
    const firstProduct = products.get(firstItem.productId)!;

    const totalAmount = dto.items.reduce((sum, item) => {
      const product = products.get(item.productId)!;
      return sum + product.price * item.quantity;
    }, 0);

    const cartItems = dto.items.map((item) => {
      const product = products.get(item.productId)!;
      return {
        productId: product.id,
        productName: product.name,
        stripePriceId: product.stripePriceId,
        quantity: item.quantity,
        unitAmount: product.price,
        subtotal: product.price * item.quantity,
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
      },
    });

    return {
      checkoutUrl: stripeSession.url ?? '',
      purchaseIds: [purchase.id],
    };
  }

  /**
   * Busca todos os produtos em paralelo e valida que existem e estão ativos.
   * Retorna um Map para acesso O(1) por productId.
   */
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
