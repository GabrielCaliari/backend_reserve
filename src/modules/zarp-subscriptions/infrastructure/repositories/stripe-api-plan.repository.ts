import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  IStripePlanRepository,
  CreateStripePlanData,
  UpdateStripePlanData,
} from '../../domain/interfaces/stripe-plan.repository.interface';
import { StripePlanEntity } from '../../domain/entities/stripe-plan.entity';
import { IStripeProvider, STRIPE_PROVIDER } from '../../domain/interfaces/stripe.provider.interface';
import { ITenantBillingConfigRepository, TENANT_BILLING_CONFIG_REPOSITORY } from '../../domain/interfaces/tenant-billing-config.repository.interface';

/**
 * Stripe API Plan Repository
 * 
 * CRITICAL: This repository fetches data directly from Stripe API,
 * not from the local database. This ensures that products/plans
 * created directly in Stripe Dashboard appear in the application.
 * 
 * The local database is used only for caching and write operations.
 */
@Injectable()
export class StripeApiPlanRepository implements IStripePlanRepository {
  private readonly logger = new Logger(StripeApiPlanRepository.name);

  constructor(
    @Inject(STRIPE_PROVIDER)
    private readonly stripeProvider: IStripeProvider,
    @Inject(TENANT_BILLING_CONFIG_REPOSITORY)
    private readonly billingConfigRepository: ITenantBillingConfigRepository,
  ) {}

  /**
   * Create a plan - saves to Stripe and returns the result
   */
  async create(data: CreateStripePlanData): Promise<StripePlanEntity> {
    // This method is called after the product/price are already created in Stripe
    // We just need to return the entity representation
    return new StripePlanEntity({
      id: data.stripeProductId, // Use Stripe product ID as the entity ID
      slug: data.slug,
      planName: data.planName,
      description: data.description,
      stripeProductId: data.stripeProductId,
      stripePriceId: data.stripePriceId,
      stripeTrialPriceId: data.stripeTrialPriceId,
      billingInterval: data.billingInterval,
      unitAmount: data.unitAmount,
      currency: data.currency,
      releasedCredits: data.releasedCredits,
      creditsReleasedTrialPeriod: data.creditsReleasedTrialPeriod,
      guestLimit: data.guestLimit,
      trialDays: data.trialDays,
      active: data.active,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Find plan by ID - fetches from Stripe API
   */
  async findById(id: string, tenantId?: string): Promise<StripePlanEntity | null> {
    try {
      // Get Stripe secret key if tenantId provided
      const stripeSecretKey = tenantId ? await this.getTenantStripeKey(tenantId) : undefined;
      
      const products = await this.stripeProvider.listAllProducts(true, stripeSecretKey);
      const product = products.find(p => p.id === id);
      
      if (!product) {
        return null;
      }

      // If no stripeSecretKey, cannot fetch prices
      if (!stripeSecretKey) {
        this.logger.warn(`Cannot map product ${id} without tenant Stripe key`);
        return null;
      }

      return await this.mapProductToEntity(product, stripeSecretKey);
    } catch (error) {
      this.logger.error(`Error fetching plan by ID ${id} from Stripe:`, error);
      return null;
    }
  }

  /**
   * Find plan by slug - fetches from Stripe API using metadata
   */
  async findBySlug(slug: string, tenantId?: string): Promise<StripePlanEntity | null> {
    try {
      // Get Stripe secret key if tenantId provided
      const stripeSecretKey = tenantId ? await this.getTenantStripeKey(tenantId) : undefined;
      
      const products = await this.stripeProvider.listAllProducts(true, stripeSecretKey);
      const product = products.find(p => p.metadata?.slug === slug);
      
      if (!product) {
        return null;
      }

      // If no stripeSecretKey, cannot fetch prices
      if (!stripeSecretKey) {
        this.logger.warn(`Cannot map product with slug ${slug} without tenant Stripe key`);
        return null;
      }

      return await this.mapProductToEntity(product, stripeSecretKey);
    } catch (error) {
      this.logger.error(`Error fetching plan by slug ${slug} from Stripe:`, error);
      return null;
    }
  }

  /**
   * Find all plans - fetches from Stripe API
   * This is the CRITICAL method that was returning only local data
   * 
   * @param includeInactive - Include inactive products
   * @param tenantId - Tenant ID to use tenant-specific Stripe keys (REQUIRED)
   */
  async findAll(includeInactive = false, tenantId?: string): Promise<StripePlanEntity[]> {
    try {
      if (!tenantId) {
        this.logger.error('tenantId is required to fetch plans from Stripe');
        throw new Error('tenantId is required to fetch plans from Stripe');
      }

      this.logger.log(`Fetching plans from Stripe API (includeInactive: ${includeInactive}, tenantId: ${tenantId})`);
      
      // Get Stripe secret key from tenant billing config
      const stripeSecretKey = await this.getTenantStripeKey(tenantId);
      
      if (!stripeSecretKey) {
        this.logger.error(`No Stripe configuration found for tenant ${tenantId}`);
        throw new Error(`Tenant ${tenantId} does not have Stripe configured. Please configure Stripe keys in TenantBillingConfig.`);
      }
      
      const products = await this.stripeProvider.listAllProducts(includeInactive, stripeSecretKey);
      
      this.logger.log(`Found ${products.length} products in Stripe for tenant ${tenantId}`);

      // Process in batches of 5 to avoid Stripe rate limits (429)
      const BATCH_SIZE = 5;
      const BATCH_DELAY_MS = 300;
      const results: StripePlanEntity[] = [];

      for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(product => this.mapProductToEntity(product, stripeSecretKey))
        );
        results.push(...(batchResults.filter(e => e !== null) as StripePlanEntity[]));

        // Delay between batches (skip delay after last batch)
        if (i + BATCH_SIZE < products.length) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
        }
      }

      return results;
    } catch (error) {
      this.logger.error('Error fetching plans from Stripe:', error);
      throw error;
    }
  }

  /**
   * Find all active plans - fetches from Stripe API
   * @param tenantId - Tenant ID to use tenant-specific Stripe keys (REQUIRED)
   */
  async findAllActive(tenantId?: string): Promise<StripePlanEntity[]> {
    return this.findAll(false, tenantId);
  }

  /**
   * Update plan - updates in Stripe and returns the result
   */
  async update(id: string, data: UpdateStripePlanData): Promise<StripePlanEntity> {
    try {
      // For now, we only support updating the active status in Stripe
      // Other metadata should be updated via Stripe Dashboard or API directly
      if (data.active !== undefined) {
        if (!data.active) {
          await this.stripeProvider.archiveProduct(id);
        }
      }

      // Fetch the updated product
      const entity = await this.findById(id);
      if (!entity) {
        throw new Error(`Plan ${id} not found after update`);
      }

      return entity;
    } catch (error) {
      this.logger.error(`Error updating plan ${id} in Stripe:`, error);
      throw error;
    }
  }

  /**
   * Delete plan - archives in Stripe (never actually deletes)
   */
  async delete(id: string): Promise<void> {
    try {
      await this.stripeProvider.archiveProduct(id);
      this.logger.log(`Plan ${id} archived in Stripe`);
    } catch (error) {
      this.logger.error(`Error archiving plan ${id} in Stripe:`, error);
      throw error;
    }
  }

  // ─── Mapping ───────────────────────────────────────────────────────────────

  /**
   * Maps a Stripe Product to a StripePlanEntity
   * Fetches the associated price and extracts metadata
   */
  private async mapProductToEntity(product: any, stripeSecretKey: string): Promise<StripePlanEntity | null> {
    try {
      // Fetch prices for this product using the tenant's Stripe key
      const prices = await this.stripeProvider.listPricesForProduct(product.id, stripeSecretKey);
      
      if (prices.length === 0) {
        this.logger.warn(`Product ${product.id} has no prices, skipping`);
        return null;
      }

      // Get the main price (first active recurring price)
      const mainPrice = prices.find(p => p.recurring) || prices[0];

      // Extract metadata from product
      const metadata = product.metadata || {};

      return new StripePlanEntity({
        id: product.id,
        slug: metadata.slug || product.id,
        planName: product.name,
        description: product.description || undefined,
        stripeProductId: product.id,
        stripePriceId: mainPrice.id,
        stripeTrialPriceId: undefined, // TODO: identify trial price if exists
        billingInterval: this.mapStripeToBillingInterval(mainPrice.recurring),
        unitAmount: mainPrice.unit_amount || 0,
        currency: mainPrice.currency || 'brl',
        releasedCredits: parseInt(metadata.released_credits || '0', 10),
        creditsReleasedTrialPeriod: parseInt(metadata.credits_released_trial_period || '0', 10),
        guestLimit: parseInt(metadata.guest_limit || '0', 10),
        trialDays: parseInt(metadata.trial_days || '0', 10),
        active: product.active,
        createdAt: new Date(product.created * 1000),
        updatedAt: new Date(product.updated * 1000),
      });
    } catch (error) {
      this.logger.error(`Error mapping product ${product.id} to entity:`, error);
      return null;
    }
  }

  /**
   * Maps Stripe recurring interval to billing interval enum
   */
  private mapStripeToBillingInterval(recurring: any): number {
    if (!recurring) return 2; // default monthly

    if (recurring.interval === 'week') return 1;
    if (recurring.interval === 'month' && recurring.interval_count === 1) return 2;
    if (recurring.interval === 'month' && recurring.interval_count === 3) return 3;
    if (recurring.interval === 'year') return 4;

    return 2; // default monthly
  }

  /**
   * Get tenant's Stripe secret key from billing config
   */
  private async getTenantStripeKey(tenantId: string): Promise<string | undefined> {
    try {
      const stripeSecretKey = await this.billingConfigRepository.getStripeSecretKey(tenantId);

      if (!stripeSecretKey) {
        this.logger.warn(`No Stripe configuration found for tenant ${tenantId}`);
        return undefined;
      }

      return stripeSecretKey;
    } catch (error) {
      this.logger.error(`Error fetching Stripe key for tenant ${tenantId}:`, error);
      return undefined;
    }
  }
}
