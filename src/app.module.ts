import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';

// Shared modules
import { DatabaseModule } from './shared/database/database.module';
import { AuthModule } from './shared/auth/auth.module';

// Bounded Context modules
import { ReserveAuthModule } from './modules/reserve-auth/reserve-auth.module';
import { ReserveBrandsModule } from './modules/reserve-brands/reserve-brands.module';
import { ReserveCnpjsModule } from './modules/reserve-cnpjs/reserve-cnpjs.module';
import { ReserveJournalsModule } from './modules/reserve-journals/reserve-journals.module';
import { ReserveMailerModule } from './modules/reserve-mailer/reserve-mailer.module';
import { ReservePiBotModule } from './modules/reserve-pi-bot/reserve-pi-bot.module';
import { ReserveCmsModule } from './modules/reserve-cms/reserve-cms.module';
import { ReserveLeadsModule } from './modules/reserve-leads/reserve-leads.module';
import { ReserveStatsModule } from './modules/reserve-stats/reserve-stats.module';
import { ReserveReportsModule } from './modules/reserve-reports/reserve-reports.module';
import { ReserveSubscriptionsModule } from './modules/reserve-subscriptions/reserve-subscriptions.module';
import { ReserveB2cProductsModule } from './modules/reserve-b2c-products/reserve-b2c-products.module';
import { ReserveB2cSubscriptionsModule } from './modules/reserve-b2c-subscriptions/reserve-b2c-subscriptions.module';
import { ReserveB2bPaymentsModule } from './modules/reserve-b2b-payments/reserve-b2b-payments.module';
import { ReserveUnifiedWebhooksModule } from './modules/reserve-unified-webhooks/reserve-unified-webhooks.module';
import { ReserveCouponsModule } from './modules/reserve-coupons/reserve-coupons.module';
import { ReserveLicensefixModule } from './modules/reserve-licensefix/reserve-licensefix.module';
import { ReserveNotificationsModule } from './modules/reserve-notifications/reserve-notifications.module';
import { ReserveClientPortalModule } from './modules/reserve-client-portal/reserve-client-portal.module';

// Shared pipes
import { ToLowercaseQueryParamsPipe, ToLowercaseBodyRequestPipe } from './shared/pipes';

@Module({
  imports: [
    // Global shared modules
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    ScheduleModule.forRoot(),

    // Bounded Contexts
    ReserveAuthModule,
    ReserveBrandsModule,
    ReserveCnpjsModule,
    ReserveJournalsModule,
    ReserveMailerModule,
    ReservePiBotModule,
    ReserveCmsModule,
    ReserveLeadsModule,
    ReserveStatsModule,
    ReserveReportsModule,
    ReserveSubscriptionsModule,
    ReserveB2cProductsModule,
    ReserveB2cSubscriptionsModule,
    ReserveB2bPaymentsModule,
    ReserveUnifiedWebhooksModule,
    ReserveCouponsModule,
    ReserveLicensefixModule,
    ReserveNotificationsModule,
    ReserveClientPortalModule,

    // Route prefixes per bounded context
    RouterModule.register([

      {
        path: 'brands',
        module: ReserveBrandsModule,
      },
      {
        path: 'cnpjs',
        module: ReserveCnpjsModule,
      },
      {
        path: 'journals',
        module: ReserveJournalsModule,
      },
      {
        path: 'mailer',
        module: ReserveMailerModule,
      },
      {
        path: 'pi-bot',
        module: ReservePiBotModule,
      },
      {
        path: 'cms',
        module: ReserveCmsModule,
      },
      {
        path: 'leads',
        module: ReserveLeadsModule,
      },
      {
        path: 'stats',
        module: ReserveStatsModule,
      },
      {
        path: 'reports',
        module: ReserveReportsModule,
      },
      // ReserveNotificationsModule uses full paths in controllers:
      // - NotificationTenantController    → /api/notifications/tenant
      // - NotificationSettingsController  → /api/notifications/settings
      // - NotificationController          → /api/notifications/...
      // No RouterModule prefix needed — controllers declare their own full paths.
      // ReserveSubscriptionsModule uses full paths in controllers:
      // - SubscriptionsController       → /api/subscriptions/...
      // - TenantBillingConfigController → /api/payments/billing-config
      // - StripeWebhookController       → /api/webhooks/stripe
      // No RouterModule prefix needed — controllers declare their own full paths.
    ]),
  ],
  controllers: [AppController],
  providers: [
    ToLowercaseQueryParamsPipe,
    ToLowercaseBodyRequestPipe,
  ],
})
export class AppModule {}
