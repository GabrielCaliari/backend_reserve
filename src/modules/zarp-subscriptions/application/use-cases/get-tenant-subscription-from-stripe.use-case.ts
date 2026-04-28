import { Inject, Injectable, Logger } from '@nestjs/common';
import { IStripeProvider, STRIPE_PROVIDER } from '../../domain/interfaces/stripe.provider.interface';
import { SubscriptionResponseDTO } from '../dtos/subscription-response.dto';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { ITenantBillingConfigRepository, TENANT_BILLING_CONFIG_REPOSITORY } from '../../domain/interfaces/tenant-billing-config.repository.interface';

/**
 * Get Tenant Subscription From Stripe Use Case
 * 
 * CRITICAL: This use case fetches subscription data directly from Stripe API,
 * not from the local database. This ensures that subscriptions created
 * directly in Stripe Dashboard appear in the application.
 */
@Injectable()
export class GetTenantSubscriptionFromStripeUseCase {
  private readonly logger = new Logger(GetTenantSubscriptionFromStripeUseCase.name);

  constructor(
    @Inject(STRIPE_PROVIDER)
    private readonly stripeProvider: IStripeProvider,
    private readonly prisma: PrismaService,
    @Inject(TENANT_BILLING_CONFIG_REPOSITORY)
    private readonly billingConfigRepository: ITenantBillingConfigRepository,
  ) {}

  async execute(tenantId: string): Promise<SubscriptionResponseDTO | null> {
    try {
      this.logger.log(`Fetching subscription for tenant ${tenantId} from Stripe API`);

      // 1. Get tenant and billing config to find Stripe keys
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { 
          stripe_customer_id: true,
          name: true,
        },
      });

      if (!tenant) {
        this.logger.warn(`Tenant ${tenantId} not found`);
        return null;
      }

      // 2. Get tenant billing config to retrieve Stripe secret key
      const stripeSecretKey = await this.billingConfigRepository.getStripeSecretKey(tenantId);

      if (!stripeSecretKey) {
        this.logger.warn(`No Stripe configuration found for tenant ${tenantId}`);
        return null;
      }

      let customerId = tenant.stripe_customer_id;

      // 3. If no customer_id saved, try to create one in Stripe
      if (!customerId) {
        this.logger.log(`No stripe_customer_id saved for tenant ${tenantId}, creating customer in Stripe`);
        
        try {
          const customer = await this.stripeProvider.createOrRetrieveCustomer({
            email: `tenant-${tenantId}@placeholder.com`, // Placeholder email
            name: tenant.name || undefined,
            metadata: { tenant_id: tenantId },
            stripeSecretKey, // Use tenant's Stripe key
          });
          
          customerId = customer.id;
          
          // Save the customer ID for future use
          await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { stripe_customer_id: customerId },
          });
          
          this.logger.log(`Created customer ${customerId} for tenant ${tenantId}`);
        } catch (error) {
          this.logger.error(`Error creating customer for tenant ${tenantId}:`, error);
          return null;
        }
      }

      if (!customerId) {
        this.logger.warn(`No customer ID found for tenant ${tenantId}`);
        return null;
      }

      // 4. Fetch subscriptions from Stripe using tenant's key
      const subscriptions = await this.stripeProvider.listCustomerSubscriptions(
        customerId,
        stripeSecretKey, // Use tenant's Stripe key
      );

      if (subscriptions.length === 0) {
        this.logger.log(`No subscriptions found for customer ${customerId}`);
        return null;
      }

      // 5. Get the most recent subscription (or the active one)
      const activeSubscription = subscriptions.find(s => 
        ['active', 'trialing'].includes(s.status)
      );
      
      const stripeSubscription = activeSubscription || subscriptions[0];
      
      this.logger.log(`Found subscription ${stripeSubscription.id} with status ${stripeSubscription.status}`);

      // 6. Extract price and product information
      const subscriptionItem = stripeSubscription.items.data[0];
      const price = subscriptionItem?.price;
      const productId = typeof price?.product === 'string' 
        ? price.product 
        : price?.product?.id;

      // 7. Map to DTO
      return {
        id: stripeSubscription.id,
        tenantId: tenantId,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: customerId,
        stripePriceId: price?.id || '',
        stripeProductId: productId || '',
        status: this.mapStripeStatusToEnum(stripeSubscription.status),
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        trialStart: stripeSubscription.trial_start 
          ? new Date(stripeSubscription.trial_start * 1000) 
          : undefined,
        trialEnd: stripeSubscription.trial_end 
          ? new Date(stripeSubscription.trial_end * 1000) 
          : undefined,
        canceledAt: stripeSubscription.canceled_at 
          ? new Date(stripeSubscription.canceled_at * 1000) 
          : undefined,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        amount: price?.unit_amount || 0,
        formattedAmount: (price?.unit_amount || 0) / 100,
        currency: price?.currency || 'brl',
        interval: price?.recurring?.interval || 'month',
        intervalCount: price?.recurring?.interval_count || 1,
        daysRemaining: Math.ceil(
          (stripeSubscription.current_period_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24)
        ),
        isActive: ['active', 'trialing'].includes(stripeSubscription.status),
        isInTrial: stripeSubscription.status === 'trialing',
        metadata: stripeSubscription.metadata || {},
        createdAt: new Date(stripeSubscription.created * 1000),
        updatedAt: new Date(stripeSubscription.created * 1000), // Stripe doesn't track updated_at
      };
    } catch (error) {
      this.logger.error(`Error fetching subscription for tenant ${tenantId} from Stripe:`, error);
      throw new Error(`Failed to fetch subscription from Stripe: ${error.message}`);
    }
  }

  /**
   * Maps Stripe subscription status to our enum
   */
  private mapStripeStatusToEnum(status: string): any {
    // Stripe status values match our enum values
    return status as any;
  }
}
