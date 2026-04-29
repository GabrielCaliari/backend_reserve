import { Injectable, Inject, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import {
  IB2BPurchaseRepository,
  B2B_PURCHASE_REPOSITORY,
} from '../../domain/interfaces/b2b-purchase.repository.interface';
import { EPurchaseStatus } from '../../domain/enums/purchase-status.enum';
import { PrismaService } from '../../../../shared/database/prisma.service';

@Injectable()
export class ProcessB2BWebhookUseCase {
  private readonly logger = new Logger(ProcessB2BWebhookUseCase.name);

  constructor(
    @Inject(B2B_PURCHASE_REPOSITORY)
    private readonly purchaseRepo: IB2BPurchaseRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'checkout.session.expired':
        await this.handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
        break;
      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      default:
        this.logger.log(`Unhandled B2B event type: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const tenantId = session.metadata?.tenant_id;
    const checkoutId = session.id;

    if (!tenantId) {
      this.logger.warn(`checkout.session.completed missing tenant_id in metadata: ${checkoutId}`);
      return;
    }

    // Find purchase by stripe_checkout_id
    const purchase = await this.purchaseRepo.findByStripeCheckoutId(tenantId, checkoutId);
    if (!purchase) {
      this.logger.warn(`Purchase not found for checkout ${checkoutId} tenant ${tenantId}`);
      return;
    }

    // Try to find or create user by email
    let userId: string | undefined;
    const customerEmail = session.customer_details?.email ?? purchase.customerEmail;
    const customerName = session.customer_details?.name ?? purchase.customerName ?? undefined;

    const existingUser = await this.prisma.user.findFirst({
      where: { email: customerEmail },
      select: { id: true },
    });
    userId = existingUser?.id;

    await this.purchaseRepo.updateByStripeCheckoutId(tenantId, checkoutId, {
      status: EPurchaseStatus.COMPLETED,
      stripePaymentIntent: session.payment_intent as string ?? undefined,
      userId,
      checkoutCompletedAt: new Date(),
    });

    this.logger.log(`B2B purchase completed: ${purchase.id} (tenant: ${tenantId}, email: ${customerEmail})`);
  }

  private async handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
    const tenantId = session.metadata?.tenant_id;
    if (!tenantId) return;

    await this.purchaseRepo.updateByStripeCheckoutId(tenantId, session.id, {
      status: EPurchaseStatus.ABANDONED,
      checkoutAbandonedAt: new Date(),
    });

    this.logger.log(`B2B checkout abandoned: ${session.id} (tenant: ${tenantId})`);
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    const tenantId = charge.metadata?.tenant_id;
    if (!tenantId || !charge.payment_intent) return;

    // Find purchase by payment_intent
    const purchases = await this.prisma.b2BPurchase.findMany({
      where: {
        tenant_id: tenantId,
        stripe_payment_intent: charge.payment_intent as string,
      },
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
