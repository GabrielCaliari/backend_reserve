import { Module } from '@nestjs/common';
import { APP_GUARD, RouterModule } from '@nestjs/core';
import { SecurityPostureGuard } from './shared/auth/guards/security-posture.guard';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';

// Shared modules
import { DatabaseModule } from './shared/database/database.module';
import { AuthModule } from './shared/auth/auth.module';
import { RbacModule } from './shared/auth/rbac/rbac.module';

// Bounded Context modules
import { ReserveAuthModule } from './modules/reserve-auth/reserve-auth.module';
import { ReserveMailerModule } from './modules/reserve-mailer/reserve-mailer.module';
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
import { ReserveNotificationsModule } from './modules/reserve-notifications/reserve-notifications.module';
import { ReserveClientPortalModule } from './modules/reserve-client-portal/reserve-client-portal.module';

// Shared pipes
import { ToLowercaseQueryParamsPipe, ToLowercaseBodyRequestPipe } from './shared/pipes';

@Module({
  imports: [
    // Global shared modules
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    DatabaseModule,
    AuthModule,
    RbacModule,
    ScheduleModule.forRoot(),

    // Bounded Contexts
    ReserveAuthModule,
    ReserveMailerModule,
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
    ReserveNotificationsModule,
    ReserveClientPortalModule,

    // Route prefixes per bounded context
    RouterModule.register([

      {
        path: 'mailer',
        module: ReserveMailerModule,
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
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SecurityPostureGuard },
  ],
})
export class AppModule {}
