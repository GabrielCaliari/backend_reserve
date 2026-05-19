import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  ITenantSettingRepository,
  ITenantSettingRow,
} from '../../domain/interfaces/tenant-setting.repository.interface';

/**
 * Storage keys are snake_case on the wire to the database (see SettingsService,
 * which converts the camelCase contract key before calling in here).
 */
@Injectable()
export class PrismaTenantSettingRepository implements ITenantSettingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenantAndModule(tenantId: string, module: string): Promise<ITenantSettingRow[]> {
    const rows = await this.prisma.tenantSetting.findMany({
      where: { tenant_id: tenantId, module },
      select: { key: true, value: true },
    });
    return rows.map((row) => ({ key: row.key, value: row.value as unknown }));
  }

  async findOne(
    tenantId: string,
    module: string,
    key: string,
  ): Promise<{ value: unknown } | null> {
    const row = await this.prisma.tenantSetting.findUnique({
      where: { tenant_id_module_key: { tenant_id: tenantId, module, key } },
      select: { value: true },
    });
    return row ? { value: row.value as unknown } : null;
  }

  async upsert(
    tenantId: string,
    module: string,
    key: string,
    value: unknown,
    updatedBy?: string,
  ): Promise<void> {
    await this.prisma.tenantSetting.upsert({
      where: { tenant_id_module_key: { tenant_id: tenantId, module, key } },
      create: {
        tenant_id: tenantId,
        module,
        key,
        value: value as any,
        updated_by: updatedBy ?? null,
      },
      update: { value: value as any, updated_by: updatedBy ?? null },
    });
  }
}
