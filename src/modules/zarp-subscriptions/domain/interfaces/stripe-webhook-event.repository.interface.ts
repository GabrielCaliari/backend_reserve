/**
 * Repository interface for Stripe Webhook Events
 */
export interface IStripeWebhookEventRepository {
  /**
   * Create a new webhook event log
   */
  create(event: {
    stripeEventId: string;
    eventType: string;
    payload: any;
  }): Promise<void>;

  /**
   * Check if event already exists (for idempotency)
   */
  exists(stripeEventId: string): Promise<boolean>;

  /**
   * Mark event as processed
   */
  markAsProcessed(stripeEventId: string): Promise<void>;

  /**
   * Mark event as failed
   */
  markAsFailed(stripeEventId: string, errorMessage: string): Promise<void>;

  /**
   * Increment processing attempts
   */
  incrementAttempts(stripeEventId: string): Promise<void>;
}

/**
 * Dependency Injection Token
 */
export const STRIPE_WEBHOOK_EVENT_REPOSITORY = Symbol('STRIPE_WEBHOOK_EVENT_REPOSITORY');
