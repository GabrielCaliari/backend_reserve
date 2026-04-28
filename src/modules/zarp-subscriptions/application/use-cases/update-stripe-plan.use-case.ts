import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  IStripePlanRepository,
  STRIPE_PLAN_REPOSITORY,
} from '../../domain/interfaces/stripe-plan.repository.interface';
import { StripePlanEntity } from '../../domain/entities/stripe-plan.entity';
import { UpdateStripePlanDTO } from '../dtos/stripe-plan.dto';

@Injectable()
export class UpdateStripePlanUseCase {
  constructor(
    @Inject(STRIPE_PLAN_REPOSITORY)
    private readonly planRepository: IStripePlanRepository,
  ) {}

  /**
   * Updates local metadata only.
   * Stripe IDs (product_id, price_id) are immutable — changing them would
   * break active subscriptions that reference those price IDs.
   */
  async execute(planId: string, dto: UpdateStripePlanDTO): Promise<StripePlanEntity> {
    const existing = await this.planRepository.findById(planId);
    if (!existing) {
      throw new NotFoundException(`Plan "${planId}" not found.`);
    }

    return this.planRepository.update(planId, {
      planName: dto.plan_name,
      description: dto.description,
      releasedCredits: dto.released_credits,
      creditsReleasedTrialPeriod: dto.credits_released_trial_period,
      guestLimit: dto.guest_limit,
      trialDays: dto.trial_days,
    });
  }
}
