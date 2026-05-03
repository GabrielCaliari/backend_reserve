import { Module } from '@nestjs/common';
import { ZarpSubscriptionsModule } from '../zarp-subscriptions/zarp-subscriptions.module';
import { ZarpB2cSubscriptionsModule } from '../zarp-b2c-subscriptions/zarp-b2c-subscriptions.module';
import { ZarpB2bPaymentsModule } from '../zarp-b2b-payments/zarp-b2b-payments.module';
import { UnifiedStripeWebhookController } from './infrastructure/controllers/unified-stripe-webhook.controller';

@Module({
  imports: [ZarpSubscriptionsModule, ZarpB2cSubscriptionsModule, ZarpB2bPaymentsModule],
  controllers: [UnifiedStripeWebhookController],
})
export class ZarpUnifiedWebhooksModule {}
