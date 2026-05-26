import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { IStripeWebhookEventRepository } from '../../domain/interfaces/stripe-webhook-event.repository.interface';

@Injectable()
export class PrismaStripeWebhookEventRepository implements IStripeWebhookEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(event: {
    stripeEventId: string;
    eventType: string;
    payload: any;
  }): Promise<void> {
    await this.prisma.stripeWebhookEvent.create({
      data: {
        stripe_event_id: event.stripeEventId,
        event_type: event.eventType,
        payload: event.payload,
        processed: false,
        processing_attempts: 0,
      },
    });
  }

  async exists(stripeEventId: string): Promise<boolean> {
    const count = await this.prisma.stripeWebhookEvent.count({
      where: { stripe_event_id: stripeEventId },
    });
    return count > 0;
  }

  async markAsProcessed(stripeEventId: string): Promise<void> {
    await this.prisma.stripeWebhookEvent.update({
      where: { stripe_event_id: stripeEventId },
      data: {
        processed: true,
        updated_at: new Date(),
      },
    });
  }

  async markAsFailed(stripeEventId: string, errorMessage: string): Promise<void> {
    await this.prisma.stripeWebhookEvent.update({
      where: { stripe_event_id: stripeEventId },
      data: {
        processed: false,
        error_message: errorMessage,
        updated_at: new Date(),
      },
    });
  }

  async incrementAttempts(stripeEventId: string): Promise<void> {
    await this.prisma.stripeWebhookEvent.update({
      where: { stripe_event_id: stripeEventId },
      data: {
        processing_attempts: { increment: 1 },
        updated_at: new Date(),
      },
    });
  }

  async findFailedEvents(maxAttempts: number): Promise<import('../../domain/interfaces/stripe-webhook-event.repository.interface').IFailedWebhookEvent[]> {
    const rows = await this.prisma.stripeWebhookEvent.findMany({
      where: {
        processed: false,
        processing_attempts: { gte: 1, lt: maxAttempts },
      },
      orderBy: { created_at: 'asc' },
      take: 50,
    });

    return rows.map((r) => ({
      stripeEventId: r.stripe_event_id,
      eventType: r.event_type,
      payload: r.payload,
      processingAttempts: r.processing_attempts,
      errorMessage: r.error_message,
      createdAt: r.created_at,
    }));
  }
}
