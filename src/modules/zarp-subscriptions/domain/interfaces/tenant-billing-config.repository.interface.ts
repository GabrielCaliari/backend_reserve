import { TenantBillingConfigEntity } from '../entities/tenant-billing-config.entity';

export interface ICreateTenantBillingConfig {
  tenantId: string;
  stripePublishableKey?: string;
  stripeSecretKey?: string;       // raw — repository hashes before saving
  stripeWebhookSecret?: string;   // raw — repository hashes before saving
  stripePriceIds?: Record<string, string>;
  billingInterval: string;
  billingCollectionMode: string;
  trialEnabled: boolean;
  trialDays: number;
  currency: string;
  planName?: string;
  planDescription?: string;
  metadata?: Record<string, any>;
}

export interface IUpdateTenantBillingConfig {
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  stripePriceIds?: Record<string, string>;
  billingInterval?: string;
  billingCollectionMode?: string;
  trialEnabled?: boolean;
  trialDays?: number;
  currency?: string;
  planName?: string;
  planDescription?: string;
  metadata?: Record<string, any>;
  active?: boolean;
}

export interface ITenantBillingConfigRepository {
  findByTenantId(tenantId: string): Promise<TenantBillingConfigEntity | null>;
  create(data: ICreateTenantBillingConfig): Promise<TenantBillingConfigEntity>;
  update(tenantId: string, data: IUpdateTenantBillingConfig): Promise<TenantBillingConfigEntity>;
  delete(tenantId: string): Promise<void>;

  /** Returns the raw (decrypted) Stripe secret key for internal use only */
  getStripeSecretKey(tenantId: string): Promise<string | null>;
  /** Returns the raw (decrypted) Stripe webhook secret for internal use only */
  getStripeWebhookSecret(tenantId: string): Promise<string | null>;
  /** Returns whether secret keys are configured (without decrypting) */
  hasSecretKeys(tenantId: string): Promise<{ hasSecretKey: boolean; hasWebhookSecret: boolean }>;
}

export const TENANT_BILLING_CONFIG_REPOSITORY = Symbol('TENANT_BILLING_CONFIG_REPOSITORY');
