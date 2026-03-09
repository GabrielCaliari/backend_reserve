import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TenantService } from './tenant.service';

@Injectable()
export class TenantRetentionService {
  private readonly logger = new Logger(TenantRetentionService.name);

  constructor(private readonly tenantService: TenantService) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM, {
    name: 'tenant-retention-purge',
    timeZone: 'UTC',
  })
  async purgeExpiredTenants() {
    const purgedTenants = await this.tenantService.purgeDueTenants();

    if (purgedTenants > 0) {
      this.logger.log(`Purged ${purgedTenants} tenant(s) after retention window`);
    }
  }
}