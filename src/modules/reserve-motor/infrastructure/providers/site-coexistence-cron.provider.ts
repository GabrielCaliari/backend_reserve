import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { MotorBotEventsProvider } from './motor-bot-events.provider';

/**
 * Rotina da coexistencia do site HSystem (plano Fase 3, DEV-3, spec §9.7/§12):
 * enquanto o site vende pelo HBOOK com calendario proprio, TODA reserva do
 * site precisa entrar no motor NO MESMO DIA. Cron diario as 18h despacha o
 * lembrete ao WhatsApp da equipe via WF9 (MotorBotEventsProvider).
 *
 * Flag por tenant em TenantSetting (module 'motor', key
 * 'rotina.site-hsystem.enabled', value boolean; ausente = desligada) — lida
 * direto via prisma, sem passar pelo repositorio do reserve-settings, porque o
 * cron varre TODOS os tenants com a flag em UMA query (pool max 3). Desligar
 * quando o site novo entrar.
 */
export const SITE_HSYSTEM_FLAG_MODULE = 'motor';
export const SITE_HSYSTEM_FLAG_KEY = 'rotina.site-hsystem.enabled';
export const SITE_HSYSTEM_EVENTO = 'rotina.site_hsystem';
export const SITE_HSYSTEM_MENSAGEM =
  'Alguma reserva entrou pelo site hoje? Cadastre no motor antes de fechar o dia.';

@Injectable()
export class SiteCoexistenceCronProvider {
  private readonly logger = new Logger(SiteCoexistenceCronProvider.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly botEvents: MotorBotEventsProvider,
  ) {}

  @Cron('0 18 * * *')
  async lembreteDiario(): Promise<void> {
    const flags = await this.prisma.tenantSetting.findMany({
      where: { module: SITE_HSYSTEM_FLAG_MODULE, key: SITE_HSYSTEM_FLAG_KEY },
      select: { tenant_id: true, value: true },
    });
    // Sequencial por tenant de proposito (pool pg max: 3).
    for (const flag of flags) {
      if (flag.value !== true) continue;
      try {
        await this.botEvents.dispatch(flag.tenant_id, SITE_HSYSTEM_EVENTO, {
          mensagem: SITE_HSYSTEM_MENSAGEM,
        });
      } catch (error) {
        this.logger.error(
          `Falha no lembrete da coexistencia do site (tenant ${flag.tenant_id})`,
          error as any,
        );
      }
    }
  }
}
