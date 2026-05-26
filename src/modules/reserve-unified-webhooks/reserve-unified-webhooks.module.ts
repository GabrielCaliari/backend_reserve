import { Module } from '@nestjs/common';
import { ReserveSubscriptionsModule } from '../reserve-subscriptions/reserve-subscriptions.module';
import { ReserveB2cSubscriptionsModule } from '../reserve-b2c-subscriptions/reserve-b2c-subscriptions.module';
import { ReserveB2bPaymentsModule } from '../reserve-b2b-payments/reserve-b2b-payments.module';
import { UnifiedStripeWebhookController } from './infrastructure/controllers/unified-stripe-webhook.controller';

@Module({
  imports: [ReserveSubscriptionsModule, ReserveB2cSubscriptionsModule, ReserveB2bPaymentsModule],
  controllers: [UnifiedStripeWebhookController],
})
export class ReserveUnifiedWebhooksModule {}
