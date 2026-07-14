import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { UpdateAttributionSettingsDto } from '../dtos/attribution-settings.dto';

export interface IAttributionSettings {
  window_days: number;
  source_priority: string[];
}

const DEFAULT_WINDOW_DAYS = 30;

/**
 * §3.9 "atribuição declarada... janela explícita e visível" — the settings
 * screen must never 404 on a fresh tenant, so getOrDefault seeds a virtual
 * default rather than requiring an explicit row.
 */
@Injectable()
export class AttributionSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrDefault(tenantId: string): Promise<IAttributionSettings> {
    const settings = await this.prisma.attributionSettings.findUnique({
      where: { tenant_id: tenantId },
    });

    if (!settings) {
      return { window_days: DEFAULT_WINDOW_DAYS, source_priority: [] };
    }

    return {
      window_days: settings.window_days,
      source_priority: (settings.source_priority as string[]) ?? [],
    };
  }

  async upsert(
    tenantId: string,
    dto: UpdateAttributionSettingsDto,
  ): Promise<IAttributionSettings> {
    const settings = await this.prisma.attributionSettings.upsert({
      where: { tenant_id: tenantId },
      create: {
        tenant_id: tenantId,
        window_days: dto.window_days,
        source_priority: dto.source_priority,
      },
      update: {
        window_days: dto.window_days,
        source_priority: dto.source_priority,
      },
    });

    return {
      window_days: settings.window_days,
      source_priority: (settings.source_priority as string[]) ?? [],
    };
  }
}
