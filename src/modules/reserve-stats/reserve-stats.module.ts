import { Module } from '@nestjs/common';

// Domain interfaces / DI tokens
import { METRIC_PROVIDERS } from './domain/interfaces/metric-provider.interface';
import { EXTERNAL_METRIC_PROVIDERS } from './domain/interfaces/external-metric-provider.interface';
import { STATS_INTEGRATION_REPOSITORY } from './domain/interfaces/stats-integration.repository.interface';

// Application services
import { StatsService } from './application/services/stats.service';
import { StatsIntegrationService } from './application/services/stats-integration.service';

// Infrastructure - Repositories
import { PrismaStatsIntegrationRepository } from './infrastructure/repositories/prisma-stats-integration.repository';

// Infrastructure - Internal metric providers
import { LeadsMetricProvider } from './infrastructure/providers/leads-metric.provider';
import { CmsMetricProvider } from './infrastructure/providers/cms-metric.provider';
import { UsersMetricProvider } from './infrastructure/providers/users-metric.provider';
import { StorageMetricProvider } from './infrastructure/providers/storage-metric.provider';

// Infrastructure - External metric providers
import { GoogleSearchConsoleProvider } from './infrastructure/providers/google-search-console.provider';

// Controllers
import { StatsDashboardController } from './infrastructure/controllers/stats-dashboard.controller';
import { StatsIntegrationController } from './infrastructure/controllers/stats-integration.controller';

// Cross-module dependencies
import { ReserveAuthModule } from '../reserve-auth/reserve-auth.module';

/**
 * Reserve Stats Module
 * Bounded context: Unified metrics dashboard + external integration management
 * Route prefix: /api/stats
 *
 * Architecture:
 * - METRIC_PROVIDERS (multi-token): internal module providers (leads, cms, users)
 * - EXTERNAL_METRIC_PROVIDERS (multi-token): external stateless providers (GSC)
 * - STATS_INTEGRATION_REPOSITORY: per-tenant config storage (Prisma)
 * - StatsService: aggregates all providers into a single dashboard payload
 * - StatsIntegrationService: CRUD for external integration configs
 *
 * Adding a new internal provider:
 *   1. Implement IMetricProvider in infrastructure/providers/
 *   2. Register it below with { provide: METRIC_PROVIDERS, useClass: ..., multi: true }
 *
 * Adding a new external provider:
 *   1. Implement IExternalMetricProvider in infrastructure/providers/
 *   2. Register it with { provide: EXTERNAL_METRIC_PROVIDERS, useClass: ..., multi: true }
 */
@Module({
  imports: [
    ReserveAuthModule, // Required for AdminJwtGuard, TenantGuard, RolesGuard
  ],
  controllers: [
    StatsDashboardController,
    StatsIntegrationController,
  ],
  providers: [
    // ── Application Services ──────────────────────────────────────────────
    StatsService,
    StatsIntegrationService,

    // ── Repository implementation ─────────────────────────────────────────
    {
      provide: STATS_INTEGRATION_REPOSITORY,
      useClass: PrismaStatsIntegrationRepository,
    },

    // ── Internal metric providers (multi-token) ───────────────────────────
    // Each { multi: true } entry adds to the token's array in DI.
    // `as any` is required because NestJS 11 ClassProvider typings omit the `multi` field,
    // even though the runtime fully supports it.
    { provide: METRIC_PROVIDERS, useClass: LeadsMetricProvider, multi: true } as any,
    { provide: METRIC_PROVIDERS, useClass: CmsMetricProvider, multi: true } as any,
    { provide: METRIC_PROVIDERS, useClass: UsersMetricProvider, multi: true } as any,
    { provide: METRIC_PROVIDERS, useClass: StorageMetricProvider, multi: true } as any,

    // ── External metric providers (multi-token) ───────────────────────────
    { provide: EXTERNAL_METRIC_PROVIDERS, useClass: GoogleSearchConsoleProvider, multi: true } as any,
  ],
  exports: [
    StatsService,
    StatsIntegrationService,
  ],
})
export class ReserveStatsModule {}
