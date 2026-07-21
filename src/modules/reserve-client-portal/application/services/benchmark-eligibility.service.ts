import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

export const BENCHMARK_MIN_TENANTS = 5;
export const BENCHMARK_MIN_CONTRACT_MONTHS = 6;

/**
 * Decisao 16's hard gate for the agency benchmark: a cohort is only
 * publicly usable (i.e. servable through the read endpoint) once at least
 * `BENCHMARK_MIN_TENANTS` active tenants have been under contract for at
 * least `BENCHMARK_MIN_CONTRACT_MONTHS`. Deliberately separate from the
 * aggregation cron — "can we say this publicly" is testable independent of
 * whatever metrics get aggregated, and collection itself is never gated
 * ("coleta comeca ja", Sec7).
 */
@Injectable()
export class BenchmarkEligibilityService {
  constructor(private readonly prisma: PrismaService) {}

  async isPubliclyUsable(): Promise<boolean> {
    const count = await this.eligibleTenantCount();
    return count >= BENCHMARK_MIN_TENANTS;
  }

  async eligibleTenantCount(): Promise<number> {
    const threshold = this.contractThreshold();
    return this.prisma.hotelClient.count({
      where: {
        is_active: true,
        tenant_id: { not: null },
        contract_start: { lte: threshold },
      },
    });
  }

  private contractThreshold(): Date {
    const d = new Date();
    d.setMonth(d.getMonth() - BENCHMARK_MIN_CONTRACT_MONTHS);
    return d;
  }
}
