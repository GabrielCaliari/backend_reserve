import { StripePlanEntity } from '../../domain/entities/stripe-plan.entity';
import { StripePlanResponseDTO } from '../../application/dtos/stripe-plan.dto';

/**
 * Maps a StripePlanEntity to the HTTP response shape.
 * Keeps controller and use-case layers decoupled from the response format.
 */
export class StripePlanPresenter {
  static toResponse(entity: StripePlanEntity): StripePlanResponseDTO {
    return {
      id: entity.id,
      slug: entity.slug,
      plan_name: entity.planName,
      description: entity.description,
      stripe_product_id: entity.stripeProductId,
      stripe_price_id: entity.stripePriceId,
      stripe_trial_price_id: entity.stripeTrialPriceId,
      billing_interval: entity.billingInterval,
      unit_amount: entity.unitAmount,
      currency: entity.currency,
      released_credits: entity.releasedCredits,
      credits_released_trial_period: entity.creditsReleasedTrialPeriod,
      guest_limit: entity.guestLimit,
      trial_days: entity.trialDays,
      active: entity.active,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
  }

  static toResponseList(entities: StripePlanEntity[]): StripePlanResponseDTO[] {
    return entities.map(StripePlanPresenter.toResponse);
  }
}
