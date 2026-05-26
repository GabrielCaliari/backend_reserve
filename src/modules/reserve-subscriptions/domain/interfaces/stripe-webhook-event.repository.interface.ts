export interface IFailedWebhookEvent {
  stripeEventId: string;
  eventType: string;
  payload: any;
  processingAttempts: number;
  errorMessage: string | null;
  createdAt: Date;
}

/**
 * Repository interface for Stripe Webhook Events
 */
export interface IStripeWebhookEventRepository {
  create(event: {
    stripeEventId: string;
    eventType: string;
    payload: any;
  }): Promise<void>;

  /** Check if event already exists (idempotency) */
  exists(stripeEventId: string): Promise<boolean>;

  markAsProcessed(stripeEventId: string): Promise<void>;

  markAsFailed(stripeEventId: string, errorMessage: string): Promise<void>;

  incrementAttempts(stripeEventId: string): Promise<void>;

  /**
   * Returns unprocessed events that have failed at least once and have not
   * exceeded maxAttempts. Used by the retry scheduler.
   */
  findFailedEvents(maxAttempts: number): Promise<IFailedWebhookEvent[]>;
}

export const STRIPE_WEBHOOK_EVENT_REPOSITORY = Symbol('STRIPE_WEBHOOK_EVENT_REPOSITORY');
