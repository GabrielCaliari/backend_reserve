import { CanActivate, ExecutionContext, Injectable, Inject, ForbiddenException } from '@nestjs/common';
import {
  IUserSubscriptionRepository,
  USER_SUBSCRIPTION_REPOSITORY,
} from '../../domain/interfaces/user-subscription.repository.interface';

@Injectable()
export class SubscriptionAccessGuard implements CanActivate {
  constructor(
    @Inject(USER_SUBSCRIPTION_REPOSITORY)
    private readonly userSubscriptionRepo: IUserSubscriptionRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string = request.user_id;
    const productSlug: string = request.params.slug;

    if (!userId || !productSlug) {
      throw new ForbiddenException('Missing user or product information');
    }

    const hasAccess = await this.userSubscriptionRepo.hasActiveSubscription(userId, productSlug);

    if (!hasAccess) {
      throw new ForbiddenException('No active subscription for this product');
    }

    return true;
  }
}
