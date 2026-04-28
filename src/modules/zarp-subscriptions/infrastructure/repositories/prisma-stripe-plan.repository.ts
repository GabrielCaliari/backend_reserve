import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  IStripePlanRepository,
  CreateStripePlanData,
  UpdateStripePlanData,
} from '../../domain/interfaces/stripe-plan.repository.interface';
import { StripePlanEntity } from '../../domain/entities/stripe-plan.entity';

@Injectable()
export class PrismaStripePlanRepository implements IStripePlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateStripePlanData): Promise<StripePlanEntity> {
    const record = await this.prisma.stripePlan.create({
      data: {
        slug: data.slug,
        plan_name: data.planName,
        description: data.description,
        stripe_product_id: data.stripeProductId,
        stripe_price_id: data.stripePriceId,
        stripe_trial_price_id: data.stripeTrialPriceId,
        billing_interval: data.billingInterval,
        unit_amount: data.unitAmount,
        currency: data.currency,
        released_credits: data.releasedCredits,
        credits_released_trial_period: data.creditsReleasedTrialPeriod,
        guest_limit: data.guestLimit,
        trial_days: data.trialDays,
        active: data.active,
      },
    });

    return this.toDomain(record);
  }

  async findById(id: string): Promise<StripePlanEntity | null> {
    const record = await this.prisma.stripePlan.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findBySlug(slug: string): Promise<StripePlanEntity | null> {
    const record = await this.prisma.stripePlan.findUnique({ where: { slug } });
    return record ? this.toDomain(record) : null;
  }

  async findAll(includeInactive = false): Promise<StripePlanEntity[]> {
    const records = await this.prisma.stripePlan.findMany({
      where: includeInactive ? undefined : { active: true },
      orderBy: { created_at: 'asc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findAllActive(): Promise<StripePlanEntity[]> {
    return this.findAll(false);
  }

  async update(id: string, data: UpdateStripePlanData): Promise<StripePlanEntity> {
    const record = await this.prisma.stripePlan.update({
      where: { id },
      data: {
        ...(data.active !== undefined && { active: data.active }),
        ...(data.planName !== undefined && { plan_name: data.planName }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.releasedCredits !== undefined && { released_credits: data.releasedCredits }),
        ...(data.creditsReleasedTrialPeriod !== undefined && {
          credits_released_trial_period: data.creditsReleasedTrialPeriod,
        }),
        ...(data.guestLimit !== undefined && { guest_limit: data.guestLimit }),
        ...(data.trialDays !== undefined && { trial_days: data.trialDays }),
        updated_at: new Date(),
      },
    });

    return this.toDomain(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.stripePlan.delete({ where: { id } });
  }

  // ─── Mapping ───────────────────────────────────────────────────────────────

  private toDomain(record: {
    id: string;
    slug: string;
    plan_name: string;
    description: string | null;
    stripe_product_id: string;
    stripe_price_id: string;
    stripe_trial_price_id: string | null;
    billing_interval: number;
    unit_amount: number;
    currency: string;
    released_credits: number;
    credits_released_trial_period: number;
    guest_limit: number;
    trial_days: number;
    active: boolean;
    created_at: Date;
    updated_at: Date;
  }): StripePlanEntity {
    return new StripePlanEntity({
      id: record.id,
      slug: record.slug,
      planName: record.plan_name,
      description: record.description ?? undefined,
      stripeProductId: record.stripe_product_id,
      stripePriceId: record.stripe_price_id,
      stripeTrialPriceId: record.stripe_trial_price_id ?? undefined,
      billingInterval: record.billing_interval,
      unitAmount: record.unit_amount,
      currency: record.currency,
      releasedCredits: record.released_credits,
      creditsReleasedTrialPeriod: record.credits_released_trial_period,
      guestLimit: record.guest_limit,
      trialDays: record.trial_days,
      active: record.active,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    });
  }
}
