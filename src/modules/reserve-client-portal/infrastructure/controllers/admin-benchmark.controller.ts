import { Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { BenchmarkEligibilityService } from '../../application/services/benchmark-eligibility.service';

/**
 * Agency-wide benchmark read (Fase 6 Task 5). super_admin-only by design —
 * `hotel-portal.benchmark.read` has no role grant in permission-matrix.ts,
 * so only the PermissionsGuard's super_admin bypass reaches this route.
 * Never exposed to clients, per Sec7.
 *
 * Agregado cross-tenant (BenchmarkAggregate): nao ha um tenant unico a resolver
 * e o ModuleAccessGuard ja libera super_admin, entao este controller fica FORA
 * do gate de client-portal.
 */
@Controller('admin/hotel-portal/benchmark')
@UseGuards(AdminJwtGuard, PermissionsGuard)
@RequirePermissions('hotel-portal.benchmark.read')
export class AdminBenchmarkController {
  constructor(
    private readonly eligibilityService: BenchmarkEligibilityService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async list(@Query('cohort_metric') cohortMetric?: string) {
    const usable = await this.eligibilityService.isPubliclyUsable();
    if (!usable) {
      // Never a silently-empty 200 — that reads as "we have no benchmark",
      // a materially different (and more dangerous) claim than "not enough
      // tenants yet to say this publicly."
      throw new ForbiddenException(
        'Benchmark not yet eligible for use: fewer than 5 tenants have been under contract for 6+ months.',
      );
    }

    return this.prisma.benchmarkAggregate.findMany({
      where: cohortMetric ? { cohort_metric: cohortMetric } : undefined,
      orderBy: { computed_at: 'desc' },
      take: 20,
    });
  }
}
