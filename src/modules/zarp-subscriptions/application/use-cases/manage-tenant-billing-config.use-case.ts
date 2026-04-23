import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import {
  ITenantBillingConfigRepository,
  TENANT_BILLING_CONFIG_REPOSITORY,
} from '../../domain/interfaces/tenant-billing-config.repository.interface';
import {
  CreateTenantBillingConfigDTO,
  UpdateTenantBillingConfigDTO,
  TenantBillingConfigResponseDTO,
} from '../dtos/tenant-billing-config.dto';
import { EBillingInterval, EBillingCollectionMode } from '../../domain/enums/billing-interval.enum';

@Injectable()
export class ManageTenantBillingConfigUseCase {
  constructor(
    @Inject(TENANT_BILLING_CONFIG_REPOSITORY)
    private readonly repository: ITenantBillingConfigRepository,
  ) {}

  async getByTenantId(tenantId: string): Promise<TenantBillingConfigResponseDTO | null> {
    const config = await this.repository.findByTenantId(tenantId);
    if (!config) return null;
    return this.toResponse(config);
  }

  async create(
    tenantId: string,
    dto: CreateTenantBillingConfigDTO,
  ): Promise<TenantBillingConfigResponseDTO> {
    const existing = await this.repository.findByTenantId(tenantId);
    if (existing) {
      throw new ConflictException(
        'Billing config already exists for this tenant. Use PATCH to update it.',
      );
    }

    const created = await this.repository.create({
      tenantId,
      stripePublishableKey: dto.stripePublishableKey,
      stripeSecretKey: dto.stripeSecretKey,
      stripeWebhookSecret: dto.stripeWebhookSecret,
      stripePriceIds: dto.stripePriceIds,
      billingInterval: dto.billingInterval,
      billingCollectionMode: dto.billingCollectionMode,
      trialEnabled: dto.trialEnabled ?? false,
      trialDays: dto.trialDays ?? 7,
      currency: dto.currency ?? 'brl',
      planName: dto.planName,
      planDescription: dto.planDescription,
      metadata: dto.metadata,
    });

    return this.toResponse(created);
  }

  async update(
    tenantId: string,
    dto: UpdateTenantBillingConfigDTO,
  ): Promise<TenantBillingConfigResponseDTO> {
    const existing = await this.repository.findByTenantId(tenantId);
    if (!existing) {
      throw new NotFoundException('Billing config not found for this tenant.');
    }

    const updated = await this.repository.update(tenantId, {
      stripePublishableKey: dto.stripePublishableKey,
      stripeSecretKey: dto.stripeSecretKey,
      stripeWebhookSecret: dto.stripeWebhookSecret,
      stripePriceIds: dto.stripePriceIds,
      billingInterval: dto.billingInterval,
      billingCollectionMode: dto.billingCollectionMode,
      trialEnabled: dto.trialEnabled,
      trialDays: dto.trialDays,
      currency: dto.currency,
      planName: dto.planName,
      planDescription: dto.planDescription,
      metadata: dto.metadata,
      active: dto.active,
    });

    return this.toResponse(updated);
  }

  async delete(tenantId: string): Promise<void> {
    const existing = await this.repository.findByTenantId(tenantId);
    if (!existing) {
      throw new NotFoundException('Billing config not found for this tenant.');
    }
    await this.repository.delete(tenantId);
  }

  private toResponse(config: any): TenantBillingConfigResponseDTO {
    return {
      id: config.id,
      tenantId: config.tenantId,
      stripePublishableKey: config.stripePublishableKey ?? null,
      // Secret keys are NEVER returned — only a boolean indicating presence
      hasStripeSecretKey: false, // repository doesn't expose raw key; presence is checked separately
      hasStripeWebhookSecret: false,
      stripePriceIds: config.stripePriceIds ?? null,
      billingInterval: config.billingInterval as EBillingInterval,
      billingCollectionMode: config.billingCollectionMode as EBillingCollectionMode,
      trialEnabled: config.trialEnabled,
      trialDays: config.trialDays,
      currency: config.currency,
      planName: config.planName ?? null,
      planDescription: config.planDescription ?? null,
      metadata: config.metadata ?? null,
      active: config.active,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}
