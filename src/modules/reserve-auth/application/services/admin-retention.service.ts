import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AdminService } from './admin.service';

@Injectable()
export class AdminRetentionService {
  private readonly logger = new Logger(AdminRetentionService.name);

  constructor(private readonly adminService: AdminService) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM, {
    name: 'admin-retention-purge',
    timeZone: 'UTC',
  })
  async purgeExpiredAdmins() {
    const purged = await this.adminService.purgeDueAdmins();

    if (purged > 0) {
      this.logger.log(`Purged ${purged} admin(s) after retention window`);
    }
  }
}
