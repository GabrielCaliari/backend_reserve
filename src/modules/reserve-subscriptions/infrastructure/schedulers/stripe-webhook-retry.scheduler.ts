import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProcessStripeWebhookUseCase } from '../../application/use-cases/process-stripe-webhook.use-case';
import {
  IStripeWebhookEventRepository,
  STRIPE_WEBHOOK_EVENT_REPOSITORY,
} from '../../domain/interfaces/stripe-webhook-event.repository.interface';

/** Maximum number of processing attempts before giving up */
const MAX_RETRY_ATTEMPTS = 5;

/**
 * Retries Stripe webhook events that failed processing.
 *
 * Runs every 5 minutes and picks up events where:
 * - processed = false
 * - processing_attempts >= 1 (failed at least once)
 * - processing_attempts < MAX_RETRY_ATTEMPTS (not exhausted)
 *
 * The tenantId is not available during retry (it was in the URL at the time
 * of the original request). The use case falls back to subscription metadata.
 */
@Injectable()
export class StripeWebhookRetryScheduler {
  private readonly logger = new Logger(StripeWebhookRetryScheduler.name);

  constructor(
    private readonly processStripeWebhookUseCase: ProcessStripeWebhookUseCase,
    @Inject(STRIPE_WEBHOOK_EVENT_REPOSITORY)
    private readonly webhookEventRepository: IStripeWebhookEventRepository,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryFailedWebhooks(): Promise<void> {
    const failed = await this.webhookEventRepository.findFailedEvents(MAX_RETRY_ATTEMPTS);

    if (failed.length === 0) return;

    this.logger.log(`Retrying ${failed.length} failed webhook event(s)`);

    for (const event of failed) {
      try {
        // Reconstruct a minimal Stripe.Event from the stored payload
        const stripeEvent = {
          id: event.stripeEventId,
          type: event.eventType,
          data: { object: event.payload },
        } as any;

        // Reset the processed flag so the use case re-logs and re-processes
        await this.webhookEventRepository.markAsFailed(event.stripeEventId, 'retrying');

        await this.processStripeWebhookUseCase.execute(stripeEvent);

        this.logger.log(`Retry succeeded for event ${event.stripeEventId}`);
      } catch (error) {
        this.logger.warn(
          `Retry failed for event ${event.stripeEventId} ` +
            `(attempt ${event.processingAttempts + 1}/${MAX_RETRY_ATTEMPTS}): ` +
            (error instanceof Error ? error.message : String(error)),
        );
      }
    }
  }
}
