import { Inject, Injectable } from '@nestjs/common';
import {
  IStripePlanRepository,
  STRIPE_PLAN_REPOSITORY,
} from '../../domain/interfaces/stripe-plan.repository.interface';
import { StripePlanEntity } from '../../domain/entities/stripe-plan.entity';

@Injectable()
export class ListStripePlansUseCase {
  constructor(
    @Inject(STRIPE_PLAN_REPOSITORY)
    private readonly planRepository: IStripePlanRepository,
  ) {}

  /**
   * Admin view — returns all plans including inactive ones.
   * @param tenantId - Tenant ID to use tenant-specific Stripe keys (REQUIRED)
   */
  async executeAdmin(tenantId?: string): Promise<StripePlanEntity[]> {
    if (!tenantId) {
      throw new Error('tenantId is required to list plans');
    }
    return this.planRepository.findAll(true, tenantId);
  }

  /**
   * Public view — returns only active plans.
   * @param tenantId - Tenant ID to use tenant-specific Stripe keys (REQUIRED)
   */
  async executePublic(tenantId?: string): Promise<StripePlanEntity[]> {
    if (!tenantId) {
      throw new Error('tenantId is required to list plans');
    }
    return this.planRepository.findAllActive(tenantId);
  }
}
