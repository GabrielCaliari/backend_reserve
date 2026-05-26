import { Module } from '@nestjs/common';
import { ReserveAuthModule } from '../reserve-auth/reserve-auth.module';
import { BrandService } from './application/services/brand.service';
import { BrandController } from './infrastructure/controllers/brand.controller';
import { BrandAnalysisService } from './application/services/brand-analysis.service';
import { BrandAnalysisController } from './infrastructure/controllers/brand-analysis.controller';

// Local repositories
import BrandRepository from './infrastructure/repositories/brand.repository';
import BrandAlertRepository from './infrastructure/repositories/brand-alert.repository';
import BrandAnalysisRepository from './infrastructure/repositories/brand-analysis.repository';
import BrandMonitoringRepository from './infrastructure/repositories/brand-monitoring.repository';
import BrandNotificationRepository from './infrastructure/repositories/brand-notification.repository';
import PublicBrandSearchRepository from './infrastructure/repositories/public-brand-search.repository';
import APITokenRepository from './infrastructure/repositories/api-token.repository';

// DIP tokens
import {
  BRAND_REPOSITORY,
  BRAND_ALERT_REPOSITORY,
  BRAND_ANALYSIS_REPOSITORY,
  BRAND_MONITORING_REPOSITORY,
  API_TOKEN_REPOSITORY,
} from './domain/interfaces';

// Cross-context repositories (temporary, will be replaced by module imports)
import JournalAlertRepository from '../reserve-journals/infrastructure/repositories/journal-alert.repository';
import PlanRepository from '../reserve-auth/infrastructure/repositories/plan.repository';
import UserRepository from '../reserve-auth/infrastructure/repositories/user.repository';

// Providers
import { EuipoAPITokenProvider } from './infrastructure/providers/euipo-api-token.provider';

/**
 * Reserve Brands Module
 * Bounded context: Brand management and brand analysis
 * Route prefix: /api/brands
 */
@Module({
  imports: [ReserveAuthModule],
  controllers: [
    BrandController,
    BrandAnalysisController,
  ],
  providers: [
    // Application services
    BrandService,
    BrandAnalysisService,

    // Local repositories
    BrandRepository,
    BrandAlertRepository,
    BrandAnalysisRepository,
    BrandMonitoringRepository,
    BrandNotificationRepository,
    PublicBrandSearchRepository,
    APITokenRepository,

    // DIP repository tokens
    { provide: BRAND_REPOSITORY, useExisting: BrandRepository },
    { provide: BRAND_ALERT_REPOSITORY, useExisting: BrandAlertRepository },
    { provide: BRAND_ANALYSIS_REPOSITORY, useExisting: BrandAnalysisRepository },
    { provide: BRAND_MONITORING_REPOSITORY, useExisting: BrandMonitoringRepository },
    { provide: API_TOKEN_REPOSITORY, useExisting: APITokenRepository },

    // Cross-context repositories (temporary coupling)
    JournalAlertRepository,
    PlanRepository,
    UserRepository,

    // Providers
    EuipoAPITokenProvider,
  ],
  exports: [
    BrandService,
    BrandAnalysisService,
    // Concrete repos (backward compat)
    BrandRepository,
    BrandAlertRepository,
    BrandAnalysisRepository,
    // DIP tokens
    BRAND_REPOSITORY,
    BRAND_ALERT_REPOSITORY,
    BRAND_ANALYSIS_REPOSITORY,
    BRAND_MONITORING_REPOSITORY,
    API_TOKEN_REPOSITORY,
  ],
})
export class ReserveBrandsModule {}
