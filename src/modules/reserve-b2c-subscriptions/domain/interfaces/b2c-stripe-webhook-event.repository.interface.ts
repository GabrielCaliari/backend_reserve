export const B2C_STRIPE_WEBHOOK_EVENT_REPOSITORY = Symbol('B2C_STRIPE_WEBHOOK_EVENT_REPOSITORY');

export interface CreateWebhookEventData {
  stripeEventId: string;
  eventType: string;
  payload: any;
}

export interface IB2CStripeWebhookEventRepository {
  existsByStripeEventId(stripeEventId: string): Promise<boolean>;
  create(data: CreateWebhookEventData): Promise<void>;
}
