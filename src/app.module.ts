import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';

// Shared modules
import { DatabaseModule } from './shared/database/database.module';
import { AuthModule } from './shared/auth/auth.module';

// Bounded Context modules
import { ZarpAuthModule } from './modules/zarp-auth/zarp-auth.module';
import { ZarpBrandsModule } from './modules/zarp-brands/zarp-brands.module';
import { ZarpCnpjsModule } from './modules/zarp-cnpjs/zarp-cnpjs.module';
import { ZarpJournalsModule } from './modules/zarp-journals/zarp-journals.module';
import { ZarpMailerModule } from './modules/zarp-mailer/zarp-mailer.module';
import { ZarpPiBotModule } from './modules/zarp-pi-bot/zarp-pi-bot.module';
import { ZarpCmsModule } from './modules/zarp-cms/zarp-cms.module';
import { ZarpLeadsModule } from './modules/zarp-leads/zarp-leads.module';
import { ZarpStatsModule } from './modules/zarp-stats/zarp-stats.module';
import { ZarpReportsModule } from './modules/zarp-reports/zarp-reports.module';
import { ZarpSubscriptionsModule } from './modules/zarp-subscriptions/zarp-subscriptions.module';

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
    ZarpAuthModule,
    ZarpBrandsModule,
    ZarpCnpjsModule,
    ZarpJournalsModule,
    ZarpMailerModule,
    ZarpPiBotModule,
    ZarpCmsModule,
    ZarpLeadsModule,
    ZarpStatsModule,
    ZarpReportsModule,
    ZarpSubscriptionsModule,

    // Route prefixes per bounded context
    RouterModule.register([

      {
        path: 'brands',
        module: ZarpBrandsModule,
      },
      {
        path: 'cnpjs',
        module: ZarpCnpjsModule,
      },
      {
        path: 'journals',
        module: ZarpJournalsModule,
      },
      {
        path: 'mailer',
        module: ZarpMailerModule,
      },
      {
        path: 'pi-bot',
        module: ZarpPiBotModule,
      },
      {
        path: 'cms',
        module: ZarpCmsModule,
      },
      {
        path: 'leads',
        module: ZarpLeadsModule,
      },
      {
        path: 'stats',
        module: ZarpStatsModule,
      },
      {
        path: 'reports',
        module: ZarpReportsModule,
      },
      // ZarpSubscriptionsModule uses full paths in controllers:
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
