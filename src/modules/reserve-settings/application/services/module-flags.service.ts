import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  GATEABLE_MODULES,
  GateableModule,
  isGateableModule,
  moduleFlagKey,
} from '../../../../shared/auth/constants/gateable-modules';
import {
  invalidateModuleAccessCache,
  resolveModuleEnabled,
} from '../../../../shared/auth/module-access.util';

@Injectable()
export class ModuleFlagsService {
  constructor(
    private readonly settings: SettingsService,
    private readonly prisma: PrismaService,
  ) {}

  async getFlags(tenantId: string): Promise<Record<GateableModule, boolean>> {
    const entries = await Promise.all(
      GATEABLE_MODULES.map(
        async (module) => [module, (await resolveModuleEnabled(this.prisma, tenantId, module)).enabled] as const,
      ),
    );
    return Object.fromEntries(entries) as Record<GateableModule, boolean>;
  }

  async setFlags(
    tenantId: string,
    flags: Partial<Record<GateableModule, boolean>>,
    updatedBy: string,
  ): Promise<Record<GateableModule, boolean>> {
    for (const [name, enabled] of Object.entries(flags)) {
      if (!isGateableModule(name)) throw new BadRequestException(`Unknown module: ${name}`);
      if (typeof enabled !== 'boolean') throw new BadRequestException(`Flag for ${name} must be boolean`);
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, tenant_type: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (tenant.tenant_type === 'MASTER') {
      throw new BadRequestException('Master tenant modules are always enabled and cannot be overridden');
    }

    for (const [name, enabled] of Object.entries(flags)) {
      await this.settings.setAsSuperadmin(
        tenantId,
        'platform',
        moduleFlagKey(name as GateableModule),
        enabled,
        updatedBy,
      );
    }
    invalidateModuleAccessCache(tenantId);
    return this.getFlags(tenantId);
  }
}
