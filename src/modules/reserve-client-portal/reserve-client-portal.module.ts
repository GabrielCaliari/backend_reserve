import { Module } from '@nestjs/common';

// Controllers
import { AdminHotelClientController } from './infrastructure/controllers/admin-hotel-client.controller';
import { ClientPortalController } from './infrastructure/controllers/client-portal.controller';
import { ReportController } from './infrastructure/controllers/report.controller';
import { AdminHotelMetricsController } from './infrastructure/controllers/admin-hotel-metrics.controller';
import { GuestCrmController } from './infrastructure/controllers/guest-crm.controller';
import { WhatsAppController } from './infrastructure/controllers/whatsapp.controller';
import { WhatsAppTrackingController } from './infrastructure/controllers/whatsapp-tracking.controller';
import { WhatsAppRedirectController } from './infrastructure/controllers/whatsapp-redirect.controller';
import { BookingWebhookController } from './infrastructure/controllers/booking-webhook.controller';
import { AdminReservationsController } from './infrastructure/controllers/admin-reservations.controller';
import { AdminDigestController } from './infrastructure/controllers/admin-digest.controller';
import { AdminMilestoneController } from './infrastructure/controllers/admin-milestone.controller';
import { AdminSemesterPlanController } from './infrastructure/controllers/admin-semester-plan.controller';
import { AdminMetricGoalController } from './infrastructure/controllers/admin-metric-goal.controller';
import { AdminBotConfigProposalController } from './infrastructure/controllers/admin-bot-config-proposal.controller';
import { AdminAttributionSettingsController } from './infrastructure/controllers/admin-attribution-settings.controller';
import { BotEventIngestionController } from './infrastructure/controllers/bot-event-ingestion.controller';
import { AdminWhatsAppFunnelController } from './infrastructure/controllers/admin-whatsapp-funnel.controller';
import { AdminContentPostController } from './infrastructure/controllers/admin-content-post.controller';
import { AdminActivityLogController } from './infrastructure/controllers/admin-activity-log.controller';
import { PdfExportController } from './infrastructure/controllers/pdf-export.controller';

// Application services
import { HotelClientService } from './application/services/hotel-client.service';
import { ReservationService } from './application/services/reservation.service';
import { DashboardService } from './application/services/dashboard.service';
import { OverviewService } from './application/services/overview.service';
import { LeadsOverviewService } from './application/services/leads-overview.service';
import { InstagramOverviewService } from './application/services/instagram-overview.service';
import { ContentPostService } from './application/services/content-post.service';
import { PeriodComparisonService } from '../../shared/analytics/period-comparison.service';
import { CampaignService } from './application/services/campaign.service';
import { SiteAnalyticsService } from './application/services/site-analytics.service';
import { OtaDirectService } from './application/services/ota-direct.service';
import { ReportService } from './application/services/report.service';
import { ReputationService } from './application/services/reputation.service';
import { HotelKpiService } from './application/services/hotel-kpi.service';
import { BookingWindowService } from './application/services/booking-window.service';
import { RateParityService } from './application/services/rate-parity.service';
import { MarketingBudgetService } from './application/services/marketing-budget.service';
import { GuestCrmService } from './application/services/guest-crm.service';
import { WhatsAppService } from './application/services/whatsapp.service';
import { WhatsAppTrackingService } from './application/services/whatsapp-tracking.service';
import { RoiAnalysisService } from './application/services/roi-analysis.service';
import { DigestService } from './application/services/digest.service';
import { ActivityLogService } from './application/services/activity-log.service';
import { MilestoneService } from './application/services/milestone.service';
import { SemesterPlanService } from './application/services/semester-plan.service';
import { MetricGoalService } from './application/services/metric-goal.service';
import { BotConfigProposalService } from './application/services/bot-config-proposal.service';
import { AttributionSettingsService } from './application/services/attribution-settings.service';
import { AttributionService } from './application/services/attribution.service';
import { BotKeyProvider } from './infrastructure/providers/bot-key.provider';
import { BotEventKeyGuard } from './infrastructure/guards/bot-event-key.guard';
import { BotEventIngestionService } from './application/services/bot-event-ingestion.service';
import { BotEventProcessorService } from './application/services/bot-event-processor.service';
import { FunnelService } from './application/services/funnel.service';
import { BotChannelHealthService } from './application/services/bot-channel-health.service';
import { BotConversationService } from './application/services/bot-conversation.service';
import { FunnelMetricsService } from './application/services/funnel-metrics.service';
import { BotRetentionService } from './application/services/bot-retention.service';
import { BotRetentionPurgeCronProvider } from './infrastructure/providers/bot-retention-purge-cron.provider';
import { AdminWhatsAppContactController } from './infrastructure/controllers/admin-whatsapp-contact.controller';
import { BotIntegrationConfigService } from './application/services/bot-integration-config.service';
import { AdminBotIntegrationConfigController } from './infrastructure/controllers/admin-bot-integration-config.controller';
import { BotStageWebhookProvider } from './infrastructure/providers/bot-stage-webhook.provider';
import { BotReconciliationCronProvider } from './infrastructure/providers/bot-reconciliation-cron.provider';

// Use cases
import { ProcessReservationUseCase } from './application/use-cases/process-reservation.use-case';
import { SyncGa4DataUseCase } from './application/use-cases/sync-ga4-data.use-case';
import { SyncMetaAdsDataUseCase } from './application/use-cases/sync-meta-ads-data.use-case';
import { SyncGoogleAdsDataUseCase } from './application/use-cases/sync-google-ads-data.use-case';
import { SyncInstagramDataUseCase } from './application/use-cases/sync-instagram-data.use-case';
import { InsertOtaDataUseCase } from './application/use-cases/insert-ota-data.use-case';
import { PublishMonthlyReportUseCase } from './application/use-cases/publish-monthly-report.use-case';
import { ImportHistoricalBaselineUseCase } from './application/use-cases/import-historical-baseline.use-case';

// Infrastructure repositories
import { PrismaHotelClientRepository } from './infrastructure/repositories/prisma-hotel-client.repository';
import { PrismaReportRepository } from './infrastructure/repositories/prisma-report.repository';
import { PrismaOverviewRepository } from './infrastructure/repositories/prisma-overview.repository';

// DIP tokens
import { HOTEL_CLIENT_REPOSITORY } from './domain/interfaces/hotel-client.repository.interface';
import { DASHBOARD_REPOSITORY } from './domain/interfaces/dashboard.repository.interface';
import { REPORT_REPOSITORY } from './domain/interfaces/report.repository.interface';
import { OVERVIEW_REPOSITORY } from './domain/interfaces/overview.repository.interface';

// Booking engine providers
import { BookingEngineFactory } from './infrastructure/providers/booking-engine-factory.provider';
import { GenericAdapter } from './infrastructure/providers/adapters/generic.adapter';
import { OmnibeesAdapter } from './infrastructure/providers/adapters/omnibees.adapter';
import { StaysAdapter } from './infrastructure/providers/adapters/stays.adapter';
import { FocoAdapter } from './infrastructure/providers/adapters/foco.adapter';

// Infrastructure providers
import { Ga4Provider } from './infrastructure/providers/ga4.provider';
import { MetaAdsProvider } from './infrastructure/providers/meta-ads.provider';
import { GoogleAdsProvider } from './infrastructure/providers/google-ads.provider';
import { InstagramProvider } from './infrastructure/providers/instagram.provider';
import { CronSyncProvider } from './infrastructure/providers/cron-sync.provider';
import { DigestGenerationCronProvider } from './infrastructure/providers/digest-generation-cron.provider';
import { AesEncryptionProvider } from './infrastructure/providers/aes-encryption.provider';
import { WhatsAppProvider } from './infrastructure/providers/whatsapp.provider';
import { WhatsAppCloudApiProvider } from './infrastructure/providers/whatsapp-cloud-api.provider';
import { PdfExportProvider } from './infrastructure/providers/pdf-export.provider';
import { IntegrationHealthCronProvider } from './infrastructure/providers/integration-health-cron.provider';
import { GeolocationProvider } from '../../shared/providers/geolocation.provider';
import { HashProvider } from '../../shared/providers/hash.provider';

// Auth guards (re-exported from ReserveAuthModule via shared/auth)
import { AdminJwtGuard } from '../../shared/auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../shared/auth/guards/roles.guard';
import { ReserveAuthModule } from '../reserve-auth/reserve-auth.module';
import { ReserveNotificationsModule } from '../reserve-notifications/reserve-notifications.module';

/**
 * Reserve Client Portal Module
 * Bounded context: Hotel Marketing Dashboard — clients, campaigns, GA4, Meta Ads, Google Ads, reports
 * Admin routes:   /api/admin/hotel-portal/...
 * Portal routes:  /api/hotel-portal/...
 */
@Module({
  imports: [ReserveAuthModule, ReserveNotificationsModule],
  controllers: [
    AdminHotelClientController,
    ClientPortalController,
    ReportController,
    AdminHotelMetricsController,
    GuestCrmController,
    WhatsAppController,
    WhatsAppTrackingController,
    WhatsAppRedirectController,
    BookingWebhookController,
    AdminReservationsController,
    AdminDigestController,
    AdminMilestoneController,
    AdminSemesterPlanController,
    AdminMetricGoalController,
    AdminBotConfigProposalController,
    AdminAttributionSettingsController,
    BotEventIngestionController,
    AdminWhatsAppFunnelController,
    AdminWhatsAppContactController,
    AdminBotIntegrationConfigController,
    AdminContentPostController,
    AdminActivityLogController,
    PdfExportController,
  ],
  providers: [
    // Application services
    HotelClientService,
    ReservationService,
    DashboardService,
    OverviewService,
    LeadsOverviewService,
    InstagramOverviewService,
    ContentPostService,
    ActivityLogService,
    PeriodComparisonService,
    CampaignService,
    SiteAnalyticsService,
    OtaDirectService,
    ReportService,
    ReputationService,
    HotelKpiService,
    BookingWindowService,
    RateParityService,
    MarketingBudgetService,
    GuestCrmService,
    WhatsAppService,
    WhatsAppTrackingService,
    RoiAnalysisService,
    DigestService,
    MilestoneService,
    SemesterPlanService,
    MetricGoalService,
    BotConfigProposalService,
    AttributionSettingsService,
    AttributionService,
    BotKeyProvider,
    BotEventKeyGuard,
    BotEventIngestionService,
    BotEventProcessorService,
    FunnelService,
    BotChannelHealthService,
    BotConversationService,
    FunnelMetricsService,
    BotRetentionService,
    BotRetentionPurgeCronProvider,
    BotIntegrationConfigService,
    BotStageWebhookProvider,
    BotReconciliationCronProvider,

    // Use cases
    ProcessReservationUseCase,
    SyncGa4DataUseCase,
    SyncMetaAdsDataUseCase,
    SyncGoogleAdsDataUseCase,
    SyncInstagramDataUseCase,
    InsertOtaDataUseCase,
    PublishMonthlyReportUseCase,
    ImportHistoricalBaselineUseCase,

    // Booking engine providers
    BookingEngineFactory,
    GenericAdapter,
    OmnibeesAdapter,
    StaysAdapter,
    FocoAdapter,

    // Infrastructure providers
    Ga4Provider,
    MetaAdsProvider,
    GoogleAdsProvider,
    InstagramProvider,
    AesEncryptionProvider,
    CronSyncProvider,
    DigestGenerationCronProvider,
    WhatsAppProvider,
    WhatsAppCloudApiProvider,
    PdfExportProvider,
    IntegrationHealthCronProvider,
    GeolocationProvider,
    HashProvider,

    // Concrete repositories
    PrismaHotelClientRepository,
    PrismaReportRepository,
    PrismaOverviewRepository,

    // DIP tokens — point to concrete implementations
    { provide: HOTEL_CLIENT_REPOSITORY, useExisting: PrismaHotelClientRepository },
    { provide: DASHBOARD_REPOSITORY, useExisting: PrismaHotelClientRepository },
    { provide: REPORT_REPOSITORY, useExisting: PrismaReportRepository },
    { provide: OVERVIEW_REPOSITORY, useExisting: PrismaOverviewRepository },

    // Guards (needed because AdminJwtGuard requires ADMIN_TOKEN_VALIDATOR injected from ReserveAuthModule)
    AdminJwtGuard,
    RolesGuard,
  ],
  exports: [
    HotelClientService,
    DashboardService,
    ReportService,
    AesEncryptionProvider,
  ],
})
export class ReserveClientPortalModule {}
