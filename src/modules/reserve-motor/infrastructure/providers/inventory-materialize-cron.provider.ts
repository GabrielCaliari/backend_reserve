import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { DailyInventoryService } from '../../application/services/daily-inventory.service';

/**
 * Rola o horizonte de 365 dias do daily_inventory todo dia de madrugada.
 * Sequencial por tenant de proposito (pool pg max: 3).
 */
@Injectable()
export class InventoryMaterializeCronProvider {
  private readonly logger = new Logger(InventoryMaterializeCronProvider.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dailyInventoryService: DailyInventoryService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async materializeAll(): Promise<void> {
    const tenants = await this.prisma.motorPriceRule.findMany({
      select: { tenant_id: true },
      distinct: ['tenant_id'],
    });
    for (const { tenant_id: tenantId } of tenants) {
      try {
        await this.dailyInventoryService.materializeTenant(tenantId);
      } catch (error) {
        this.logger.error(`Falha materializando calendario do tenant ${tenantId}`, error as any);
      }
    }
  }
}
