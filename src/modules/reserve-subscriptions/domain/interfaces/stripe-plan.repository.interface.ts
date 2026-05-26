import { StripePlanEntity } from '../entities/stripe-plan.entity';

export interface CreateStripePlanData {
  slug: string;
  planName: string;
  description?: string;
  stripeProductId: string;
  stripePriceId: string;
  stripeTrialPriceId?: string;
  billingInterval: number;
  unitAmount: number;
  currency: string;
  releasedCredits: number;
  creditsReleasedTrialPeriod: number;
  guestLimit: number;
  trialDays: number;
  active: boolean;
}

export interface UpdateStripePlanData {
  active?: boolean;
  planName?: string;
  description?: string;
  releasedCredits?: number;
  creditsReleasedTrialPeriod?: number;
  guestLimit?: number;
  trialDays?: number;
}

/**
 * Repository contract for StripePlan.
 * Domain layer — pure TypeScript, no framework imports.
 * 
 * IMPORTANT: All methods that fetch from Stripe require tenantId
 * because each tenant has its own Stripe account configuration.
 */
export interface IStripePlanRepository {
  create(data: CreateStripePlanData): Promise<StripePlanEntity>;
  findById(id: string, tenantId?: string): Promise<StripePlanEntity | null>;
  findBySlug(slug: string, tenantId?: string): Promise<StripePlanEntity | null>;
  findAll(includeInactive?: boolean, tenantId?: string): Promise<StripePlanEntity[]>;
  findAllActive(tenantId?: string): Promise<StripePlanEntity[]>;
  update(id: string, data: UpdateStripePlanData): Promise<StripePlanEntity>;
  delete(id: string): Promise<void>;
}

export const STRIPE_PLAN_REPOSITORY = Symbol('STRIPE_PLAN_REPOSITORY');
