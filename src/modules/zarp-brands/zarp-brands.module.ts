import { Module } from '@nestjs/common';
import { ZarpAuthModule } from '@/modules/zarp-auth/zarp-auth.module';
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

// Cross-context repositories (temporary, will be replaced by module imports)
import JournalAlertRepository from '@/modules/zarp-journals/infrastructure/repositories/journal-alert.repository';
import PlanRepository from '@/modules/zarp-auth/infrastructure/repositories/plan.repository';
import UserRepository from '@/modules/zarp-auth/infrastructure/repositories/user.repository';
import LeadRepository from '@/modules/zarp-auth/infrastructure/repositories/lead.repository';

// Providers
import { EuipoAPITokenProvider } from '@/modules/zarp-brands/infrastructure/providers/euipo-api-token.provider';

/**
 * Zarp Brands Module
 * Bounded context: Brand management and brand analysis
 * Route prefix: /api/brands
 */
@Module({
  imports: [ZarpAuthModule],
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

    // Cross-context repositories (temporary coupling)
    JournalAlertRepository,
    PlanRepository,
    UserRepository,
    LeadRepository,

    // Providers
    EuipoAPITokenProvider,
  ],
  exports: [
    BrandService,
    BrandAnalysisService,
    BrandRepository,
    BrandAlertRepository,
    BrandAnalysisRepository,
  ],
})
export class ZarpBrandsModule {}
