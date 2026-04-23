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
    const keyPresence = await this.repository.hasSecretKeys(tenantId);
    return this.toResponse(config, keyPresence);
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

    const keyPresence = await this.repository.hasSecretKeys(tenantId);
    return this.toResponse(created, keyPresence);
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

    const keyPresence = await this.repository.hasSecretKeys(tenantId);
    return this.toResponse(updated, keyPresence);
  }

  async delete(tenantId: string): Promise<void> {
    const existing = await this.repository.findByTenantId(tenantId);
    if (!existing) {
      throw new NotFoundException('Billing config not found for this tenant.');
    }
    await this.repository.delete(tenantId);
  }

  private toResponse(
    config: any,
    keyPresence: { hasSecretKey: boolean; hasWebhookSecret: boolean },
  ): TenantBillingConfigResponseDTO {
    return {
      id: config.id,
      tenantId: config.tenantId,
      stripePublishableKey: config.stripePublishableKey ?? null,
      hasStripeSecretKey: keyPresence.hasSecretKey,
      hasStripeWebhookSecret: keyPresence.hasWebhookSecret,
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
