import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  IB2CStripeWebhookEventRepository,
  CreateWebhookEventData,
} from '../../domain/interfaces/b2c-stripe-webhook-event.repository.interface';

@Injectable()
export class PrismaB2CStripeWebhookEventRepository implements IB2CStripeWebhookEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsByStripeEventId(stripeEventId: string): Promise<boolean> {
    const record = await this.prisma.stripeWebhookEvent.findUnique({
      where: { stripe_event_id: stripeEventId },
    });
    return record !== null;
  }

  async create(data: CreateWebhookEventData): Promise<void> {
    await this.prisma.stripeWebhookEvent.create({
      data: {
        stripe_event_id: data.stripeEventId,
        event_type: data.eventType,
        payload: data.payload,
        processed: true,
      },
    });
  }
}
