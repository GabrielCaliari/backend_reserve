import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  ITenantBillingConfigRepository,
  ICreateTenantBillingConfig,
  IUpdateTenantBillingConfig,
} from '../../domain/interfaces/tenant-billing-config.repository.interface';
import { TenantBillingConfigEntity } from '../../domain/entities/tenant-billing-config.entity';
import { EBillingInterval, EBillingCollectionMode } from '../../domain/enums/billing-interval.enum';
import * as crypto from 'crypto';

/**
 * Simple symmetric encryption for Stripe secret keys.
 * Uses AES-256-GCM with a key derived from JWT_SECRET.
 * The raw key is NEVER stored in the database.
 */
function deriveEncryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET ?? 'fallback-dev-secret-change-in-prod';
  return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(plaintext: string): string {
  const key = deriveEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decrypt(ciphertext: string): string {
  const key = deriveEncryptionKey();
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

@Injectable()
export class PrismaTenantBillingConfigRepository implements ITenantBillingConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenantId(tenantId: string): Promise<TenantBillingConfigEntity | null> {
    const row = await this.prisma.tenantBillingConfig.findUnique({
      where: { tenant_id: tenantId },
    });
    return row ? this.toDomain(row) : null;
  }

  async create(data: ICreateTenantBillingConfig): Promise<TenantBillingConfigEntity> {
    const row = await this.prisma.tenantBillingConfig.create({
      data: {
        tenant_id: data.tenantId,
        stripe_publishable_key: data.stripePublishableKey,
        stripe_secret_key_hash: data.stripeSecretKey ? encrypt(data.stripeSecretKey) : null,
        stripe_webhook_secret_hash: data.stripeWebhookSecret
          ? encrypt(data.stripeWebhookSecret)
          : null,
        stripe_price_ids: data.stripePriceIds ?? undefined,
        billing_interval: data.billingInterval as any,
        billing_collection_mode: data.billingCollectionMode as any,
        trial_enabled: data.trialEnabled,
        trial_days: data.trialDays,
        currency: data.currency,
        plan_name: data.planName,
        plan_description: data.planDescription,
        metadata: data.metadata ?? undefined,
        active: true,
      },
    });
    return this.toDomain(row);
  }

  async update(
    tenantId: string,
    data: IUpdateTenantBillingConfig,
  ): Promise<TenantBillingConfigEntity> {
    const updateData: any = {};

    if (data.stripePublishableKey !== undefined)
      updateData.stripe_publishable_key = data.stripePublishableKey;
    if (data.stripeSecretKey !== undefined)
      updateData.stripe_secret_key_hash = data.stripeSecretKey
        ? encrypt(data.stripeSecretKey)
        : null;
    if (data.stripeWebhookSecret !== undefined)
      updateData.stripe_webhook_secret_hash = data.stripeWebhookSecret
        ? encrypt(data.stripeWebhookSecret)
        : null;
    if (data.stripePriceIds !== undefined) updateData.stripe_price_ids = data.stripePriceIds;
    if (data.billingInterval !== undefined) updateData.billing_interval = data.billingInterval;
    if (data.billingCollectionMode !== undefined)
      updateData.billing_collection_mode = data.billingCollectionMode;
    if (data.trialEnabled !== undefined) updateData.trial_enabled = data.trialEnabled;
    if (data.trialDays !== undefined) updateData.trial_days = data.trialDays;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.planName !== undefined) updateData.plan_name = data.planName;
    if (data.planDescription !== undefined) updateData.plan_description = data.planDescription;
    if (data.checkoutSuccessUrl !== undefined) updateData.checkout_success_url = data.checkoutSuccessUrl;
    if (data.checkoutCancelUrl !== undefined) updateData.checkout_cancel_url = data.checkoutCancelUrl;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;
    if (data.active !== undefined) updateData.active = data.active;

    const row = await this.prisma.tenantBillingConfig.update({
      where: { tenant_id: tenantId },
      data: updateData,
    });
    return this.toDomain(row);
  }

  async delete(tenantId: string): Promise<void> {
    await this.prisma.tenantBillingConfig.delete({ where: { tenant_id: tenantId } });
  }

  async getStripeSecretKey(tenantId: string): Promise<string | null> {
    const row = await this.prisma.tenantBillingConfig.findUnique({
      where: { tenant_id: tenantId },
      select: { stripe_secret_key_hash: true },
    });
    if (!row?.stripe_secret_key_hash) return null;
    return decrypt(row.stripe_secret_key_hash);
  }

  async getStripeWebhookSecret(tenantId: string): Promise<string | null> {
    const row = await this.prisma.tenantBillingConfig.findUnique({
      where: { tenant_id: tenantId },
      select: { stripe_webhook_secret_hash: true },
    });
    if (!row?.stripe_webhook_secret_hash) return null;
    return decrypt(row.stripe_webhook_secret_hash);
  }

  async hasSecretKeys(
    tenantId: string,
  ): Promise<{ hasSecretKey: boolean; hasWebhookSecret: boolean }> {
    const row = await this.prisma.tenantBillingConfig.findUnique({
      where: { tenant_id: tenantId },
      select: {
        stripe_secret_key_hash: true,
        stripe_webhook_secret_hash: true,
      },
    });
    return {
      hasSecretKey: !!row?.stripe_secret_key_hash,
      hasWebhookSecret: !!row?.stripe_webhook_secret_hash,
    };
  }

  async getCheckoutUrls(tenantId: string): Promise<{ successUrl: string; cancelUrl: string }> {
    const row = await this.prisma.tenantBillingConfig.findUnique({
      where: { tenant_id: tenantId },
      select: {
        checkout_success_url: true,
        checkout_cancel_url: true,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

    return {
      successUrl: row?.checkout_success_url ?? `${frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: row?.checkout_cancel_url ?? `${frontendUrl}/cancel`,
    };
  }

  private toDomain(row: any): TenantBillingConfigEntity {
    return new TenantBillingConfigEntity({
      id: row.id,
      tenantId: row.tenant_id,
      stripePublishableKey: row.stripe_publishable_key ?? undefined,
      // secret hashes are intentionally NOT mapped to domain — use getStripeSecretKey()
      stripePriceIds: row.stripe_price_ids as Record<string, string> | undefined,
      billingInterval: row.billing_interval as EBillingInterval,
      billingCollectionMode: row.billing_collection_mode as EBillingCollectionMode,
      trialEnabled: row.trial_enabled,
      trialDays: row.trial_days,
      currency: row.currency,
      planName: row.plan_name ?? undefined,
      planDescription: row.plan_description ?? undefined,
      checkoutSuccessUrl: row.checkout_success_url ?? undefined,
      checkoutCancelUrl: row.checkout_cancel_url ?? undefined,
      metadata: row.metadata as Record<string, any> | undefined,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
