import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

/**
 * ActiveSubscriptionGuard
 *
 * Blocks access to routes when the tenant's subscription is not active.
 * Reads Tenant.subscription_status — a denormalized field kept in sync by
 * Stripe webhook handlers — so no extra JOIN to stripe_subscriptions is needed.
 *
 * Allowed statuses: active, trialing
 * Blocked statuses: none, past_due, canceled, paused, unpaid
 *
 * Usage:
 *   @UseGuards(AdminJwtGuard, TenantGuard, ActiveSubscriptionGuard)
 *   @Get('/some-paid-feature')
 *   async paidFeature() { ... }
 *
 * The guard expects req.tenant_id to be set by TenantGuard before it runs.
 */
@Injectable()
export class ActiveSubscriptionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId: string | undefined = request.tenant_id;

    if (!tenantId) {
      throw new ForbiddenException('Tenant not identified. Ensure TenantGuard runs before ActiveSubscriptionGuard.');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { subscription_status: true },
    });

    if (!tenant) {
      throw new ForbiddenException('Tenant not found.');
    }

    const activeStatuses = ['active', 'trialing'];

    if (!activeStatuses.includes(tenant.subscription_status)) {
      throw new ForbiddenException(
        `Access denied. Subscription status is "${tenant.subscription_status}". ` +
          'An active subscription is required to use this feature.',
      );
    }

    return true;
  }
}
