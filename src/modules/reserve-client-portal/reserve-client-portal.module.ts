import { Module } from '@nestjs/common';

// Controllers
import { AdminHotelClientController } from './infrastructure/controllers/admin-hotel-client.controller';
import { ClientPortalController } from './infrastructure/controllers/client-portal.controller';
import { ReportController } from './infrastructure/controllers/report.controller';

// Application services
import { HotelClientService } from './application/services/hotel-client.service';
import { DashboardService } from './application/services/dashboard.service';
import { CampaignService } from './application/services/campaign.service';
import { SiteAnalyticsService } from './application/services/site-analytics.service';
import { OtaDirectService } from './application/services/ota-direct.service';
import { ReportService } from './application/services/report.service';

// Use cases
import { SyncGa4DataUseCase } from './application/use-cases/sync-ga4-data.use-case';
import { SyncMetaAdsDataUseCase } from './application/use-cases/sync-meta-ads-data.use-case';
import { SyncGoogleAdsDataUseCase } from './application/use-cases/sync-google-ads-data.use-case';
import { InsertOtaDataUseCase } from './application/use-cases/insert-ota-data.use-case';
import { PublishMonthlyReportUseCase } from './application/use-cases/publish-monthly-report.use-case';

// Infrastructure repositories
import { PrismaHotelClientRepository } from './infrastructure/repositories/prisma-hotel-client.repository';
import { PrismaReportRepository } from './infrastructure/repositories/prisma-report.repository';

// DIP tokens
import { HOTEL_CLIENT_REPOSITORY } from './domain/interfaces/hotel-client.repository.interface';
import { DASHBOARD_REPOSITORY } from './domain/interfaces/dashboard.repository.interface';
import { REPORT_REPOSITORY } from './domain/interfaces/report.repository.interface';

// Infrastructure providers
import { Ga4Provider } from './infrastructure/providers/ga4.provider';
import { MetaAdsProvider } from './infrastructure/providers/meta-ads.provider';
import { GoogleAdsProvider } from './infrastructure/providers/google-ads.provider';
import { CronSyncProvider } from './infrastructure/providers/cron-sync.provider';
import { AesEncryptionProvider } from './infrastructure/providers/aes-encryption.provider';

// Auth guards (re-exported from ReserveAuthModule via shared/auth)
import { AdminJwtGuard } from '../../shared/auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../shared/auth/guards/roles.guard';
import { ReserveAuthModule } from '../reserve-auth/reserve-auth.module';

/**
 * Reserve Client Portal Module
 * Bounded context: Hotel Marketing Dashboard — clients, campaigns, GA4, Meta Ads, Google Ads, reports
 * Admin routes:   /api/admin/hotel-portal/...
 * Portal routes:  /api/hotel-portal/...
 */
@Module({
  imports: [ReserveAuthModule],
  controllers: [
    AdminHotelClientController,
    ClientPortalController,
    ReportController,
  ],
  providers: [
    // Application services
    HotelClientService,
    DashboardService,
    CampaignService,
    SiteAnalyticsService,
    OtaDirectService,
    ReportService,

    // Use cases
    SyncGa4DataUseCase,
    SyncMetaAdsDataUseCase,
    SyncGoogleAdsDataUseCase,
    InsertOtaDataUseCase,
    PublishMonthlyReportUseCase,

    // Infrastructure providers
    Ga4Provider,
    MetaAdsProvider,
    GoogleAdsProvider,
    AesEncryptionProvider,
    CronSyncProvider,

    // Concrete repositories
    PrismaHotelClientRepository,
    PrismaReportRepository,

    // DIP tokens — point to concrete implementations
    { provide: HOTEL_CLIENT_REPOSITORY, useExisting: PrismaHotelClientRepository },
    { provide: DASHBOARD_REPOSITORY, useExisting: PrismaHotelClientRepository },
    { provide: REPORT_REPOSITORY, useExisting: PrismaReportRepository },

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
