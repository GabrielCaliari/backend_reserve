import { Injectable, Inject } from '@nestjs/common';
import {
  IUserSubscriptionRepository,
  USER_SUBSCRIPTION_REPOSITORY,
} from '../../domain/interfaces/user-subscription.repository.interface';
import { UserSubscriptionEntity } from '../../domain/entities/user-subscription.entity';

@Injectable()
export class ListMySubscriptionsUseCase {
  constructor(
    @Inject(USER_SUBSCRIPTION_REPOSITORY)
    private readonly userSubscriptionRepo: IUserSubscriptionRepository,
  ) {}

  async execute(userId: string): Promise<UserSubscriptionEntity[]> {
    return this.userSubscriptionRepo.findAllByUserId(userId);
  }
}
