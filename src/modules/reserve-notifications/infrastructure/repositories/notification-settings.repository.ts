import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import {
  INotificationSettingsRepository,
  IUpdateNotificationSettings,
} from '../../domain/interfaces';

@Injectable()
export class NotificationSettingsRepository implements INotificationSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenantId(tenantId: string) {
    return this.prisma.tenantNotificationSettings.findUnique({ where: { tenant_id: tenantId } });
  }

  async upsert(tenantId: string, data: IUpdateNotificationSettings) {
    try {
      return await this.prisma.tenantNotificationSettings.upsert({
        where: { tenant_id: tenantId },
        create: {
          tenant_id: tenantId,
          email_enabled: data.email_enabled ?? true,
          inapp_enabled: data.inapp_enabled ?? true,
          event_settings: data.event_settings ?? {},
          cron_settings: data.cron_settings ?? {},
        },
        update: {
          ...(data.email_enabled !== undefined && { email_enabled: data.email_enabled }),
          ...(data.inapp_enabled !== undefined && { inapp_enabled: data.inapp_enabled }),
          ...(data.event_settings !== undefined && { event_settings: data.event_settings }),
          ...(data.cron_settings !== undefined && { cron_settings: data.cron_settings }),
        },
      });
    } catch (e) {
      throw new RepositoryException('Erro ao salvar settings de notificações', e);
    }
  }
}
