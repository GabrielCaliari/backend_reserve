import { Injectable, Inject, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../domain/interfaces/product.repository.interface';
import {
  IB2BProductRepository,
  B2B_PRODUCT_REPOSITORY,
} from '../../../zarp-b2b-payments/domain/interfaces/b2b-product.repository.interface';
import {
  IB2BPurchaseRepository,
  B2B_PURCHASE_REPOSITORY,
} from '../../../zarp-b2b-payments/domain/interfaces/b2b-purchase.repository.interface';
import {
  IB2BFeeConfigRepository,
  B2B_FEE_CONFIG_REPOSITORY,
} from '../../../zarp-b2b-payments/domain/interfaces/b2b-fee-config.repository.interface';
import {
  ITenantBillingConfigRepository,
  TENANT_BILLING_CONFIG_REPOSITORY,
} from '../../../zarp-subscriptions/domain/interfaces/tenant-billing-config.repository.interface';
import { ResolveProductFeesUseCase } from './resolve-product-fees.use-case';
import { UnifiedCheckoutDTO } from '../dtos/unified-checkout.dto';
import { PrismaService } from '../../../../shared/database/prisma.service';

const STRIPE_API_VERSION = '2025-02-24.acacia' as const;

interface B2CItemTrack {
  productId: string;
  priceId: string;
  amount: number;
  currency: string;
}

@Injectable()
export class UnifiedCheckoutUseCase {
  private readonly logger = new Logger(UnifiedCheckoutUseCase.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly b2cProductRepo: IProductRepository,
    @Inject(B2B_PRODUCT_REPOSITORY)
    private readonly b2bProductRepo: IB2BProductRepository,
    @Inject(B2B_PURCHASE_REPOSITORY)
    private readonly b2bPurchaseRepo: IB2BPurchaseRepository,
    @Inject(B2B_FEE_CONFIG_REPOSITORY)
    private readonly b2bFeeConfigRepo: IB2BFeeConfigRepository,
    @Inject(TENANT_BILLING_CONFIG_REPOSITORY)
    private readonly billingConfigRepo: ITenantBillingConfigRepository,
    private readonly resolveFeesUseCase: ResolveProductFeesUseCase,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    tenantId: string,
    dto: UnifiedCheckoutDTO,
    userId?: string,
  ): Promise<{ checkoutUrl: string; purchaseIds: string[] }> {
    // 1. Get Stripe secret key
    const stripeSecretKey = await this.billingConfigRepo.getStripeSecretKey(tenantId);
    if (!stripeSecretKey) {
      throw new BadRequestException('Stripe not configured for this tenant');
    }

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const { successUrl, cancelUrl } = await this.billingConfigRepo.getCheckoutUrls(tenantId);

    // 2. Load B2B global config
    const b2bGlobalConfig = await this.b2bFeeConfigRepo.findByTenantId(tenantId);

    // 3. Build line_items and track costs
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    let maxShippingFee = 0;
    let shippingCurrency = 'brl';
    let primaryCurrency = 'brl';
    const b2bProductIds: string[] = [];
    const b2cPriceIds: string[] = [];
    const b2cItemsTrack: B2CItemTrack[] = [];

    for (const item of dto.items) {
      if (item.type === 'b2b') {
        const product = await this.b2bProductRepo.findById(item.productId, tenantId);
        if (!product || !product.isActive()) {
          throw new NotFoundException(`Produto B2B não encontrado: ${item.productId}`);
        }

        const breakdown = await this.resolveFeesUseCase.calculateBreakdown(
          tenantId,
          {
            categoryId: product.categoryId,
            chipCostOverride: product.chipCostOverride,
            shippingFeeOverride: product.shippingFeeOverride,
            requiresShipping: product.requiresShipping,
          },
          product.price,
          product.currency,
          true,
          b2bGlobalConfig,
        );

        primaryCurrency = product.currency;
        b2bProductIds.push(product.id);

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
      } else {
        // B2C
        const product = await this.b2cProductRepo.findById(item.productId, tenantId);
        if (!product || !product.active) {
          throw new NotFoundException(`Produto B2C não encontrado: ${item.productId}`);
        }

        const price = item.priceId
          ? product.prices.find((p) => p.id === item.priceId && p.active)
          : product.prices.find((p) => p.active);

        if (!price) {
          throw new BadRequestException(`Preço não encontrado para produto B2C: ${item.productId}`);
        }

        const breakdown = await this.resolveFeesUseCase.calculateBreakdown(
          tenantId,
          {
            categoryId: product.categoryId,
            chipCostOverride: product.chipCostOverride,
            shippingFeeOverride: product.shippingFeeOverride,
            requiresShipping: product.requiresShipping,
          },
          price.unitAmount,
          price.currency,
          true,
        );

        primaryCurrency = price.currency;
        b2cPriceIds.push(price.id);
        b2cItemsTrack.push({
          productId: product.id,
          priceId: price.id,
          amount: breakdown.basePrice,
          currency: price.currency,
        });

        lineItems.push({
          price_data: {
            currency: price.currency,
            product_data: { name: product.name },
            unit_amount: breakdown.basePrice,
          },
          quantity: item.quantity,
        });

        if (breakdown.chipCostAmount > 0) {
          lineItems.push({
            price_data: {
              currency: price.currency,
              product_data: { name: `Taxa de serviço — ${product.name} (${breakdown.chipCostPercent}%)` },
              unit_amount: breakdown.chipCostAmount,
            },
            quantity: item.quantity,
          });
        }

        if (breakdown.shippingFee > maxShippingFee) {
          maxShippingFee = breakdown.shippingFee;
          shippingCurrency = price.currency;
        }
      }
    }

    // Add single shipping fee if any physical product
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

    // 4. Build metadata
    const metadata: Record<string, string> = {
      tenant_id: tenantId,
      checkout_type: 'unified',
      b2b_product_ids: b2bProductIds.join(','),
      b2c_price_ids: b2cPriceIds.join(','),
      lead_name: dto.leadName ?? '',
      lead_email: dto.leadEmail ?? '',
      lead_phone: dto.leadPhone ?? '',
    };

    if (userId) {
      metadata.user_id = userId;
    } else {
      metadata.is_lead_purchase = 'true';
    }

    // 5. Create Stripe session (payment mode — mixed cart is always one-time)
    const stripe = new Stripe(stripeSecretKey, { apiVersion: STRIPE_API_VERSION });
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      customer_email: dto.leadEmail,
      metadata,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    const totalCartAmount = lineItems.reduce((s, li) => {
      const amount = (li.price_data as any)?.unit_amount ?? 0;
      const qty = li.quantity ?? 1;
      return s + amount * qty;
    }, 0);

    // 6. Persist movement record — B2B purchase (preferred) or B2C session if B2C-only cart
    const purchaseIds: string[] = [];

    if (b2bProductIds.length > 0) {
      // B2B items present: create b2b_purchase (total amount = entire cart)
      const purchase = await this.b2bPurchaseRepo.create({
        tenantId,
        productId: b2bProductIds[0],
        stripeCheckoutId: session.id,
        amount: totalCartAmount,
        currency: primaryCurrency,
        customerEmail: dto.leadEmail ?? '',
        customerName: dto.leadName,
        customerPhone: dto.leadPhone,
        metadata: {
          is_unified_cart: true,
          b2b_product_ids: b2bProductIds,
          b2c_price_ids: b2cPriceIds,
        },
      });
      purchaseIds.push(purchase.id);
    } else if (b2cItemsTrack.length > 0) {
      // B2C-only cart: create b2c_checkout_session so it appears in movements panel
      const first = b2cItemsTrack[0];
      try {
        await this.prisma.b2CCheckoutSession.create({
          data: {
            tenant_id: tenantId,
            user_id: userId ?? null,
            product_id: first.productId,
            price_id: first.priceId,
            stripe_checkout_id: session.id,
            stripe_price_id: first.priceId,
            status: 'pending',
            amount: totalCartAmount,
            currency: first.currency,
            customer_email: dto.leadEmail ?? '',
            customer_name: dto.leadName ?? null,
            customer_phone: dto.leadPhone ?? null,
            is_lead_purchase: !userId,
            metadata: {
              is_unified_cart: true,
              b2c_price_ids: b2cItemsTrack.map((i) => i.priceId),
            },
          },
        });
      } catch (err) {
        this.logger.warn(`Could not create B2CCheckoutSession for B2C-only cart ${session.id}: ${err}`);
      }
    }

    return { checkoutUrl: session.url ?? '', purchaseIds };
  }
}
