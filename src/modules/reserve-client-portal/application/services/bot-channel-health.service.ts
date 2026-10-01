import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { EPlatform } from '../../../../generated/prisma/enums';

/** Contrato v2 §4.5: o bot manda heartbeat a cada minuto; mais de 5 min sem sinal = fora do ar. */
const HEARTBEAT_STALE_MINUTES = 5;

interface HeartbeatData {
  bot_enabled?: unknown; mode?: unknown; ai_enabled?: unknown;
  last_echo_at?: unknown; last_polling_at?: unknown;
  active_conversations?: unknown; paused_awaiting_human?: unknown;
}

const inteiro = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Math.trunc(Number(v))) : 0);
const textoOuNull = (v: unknown) => (typeof v === 'string' && v ? v : null);

/** Bloco Canais — saude do bot de WhatsApp lida do ultimo heartbeat, mais Instagram e Meta Ads. */
@Injectable()
export class BotChannelHealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getChannels(clientId: string) {
    const client = await this.prisma.hotelClient.findUnique({
      where: { id: clientId },
      select: { tenant_id: true },
    });
    const tenantId = client?.tenant_id ?? null;

    const [botConfig, metaAdsCredential] = await Promise.all([
      tenantId
        ? this.prisma.botIntegrationConfig.findUnique({ where: { tenant_id: tenantId } })
        : Promise.resolve(null),
      this.prisma.hotelApiCredential.findFirst({
        where: { client_id: clientId, platform: EPlatform.META_ADS },
      }),
    ]);

    const heartbeat = (botConfig?.last_heartbeat_data ?? {}) as HeartbeatData;
    const heartbeatAgeMinutes = botConfig?.last_heartbeat_at
      ? Math.floor((Date.now() - botConfig.last_heartbeat_at.getTime()) / 60000)
      : null;
    const heartbeatStale = heartbeatAgeMinutes === null || heartbeatAgeMinutes > HEARTBEAT_STALE_MINUTES;

    return {
      whatsapp: {
        connected: Boolean(botConfig?.active) && !heartbeatStale,
        botEnabled: heartbeat.bot_enabled === true,
        heartbeatAgeMinutes,
        heartbeatStale,
        activeConversations: inteiro(heartbeat.active_conversations),
        pausedAwaitingHuman: inteiro(heartbeat.paused_awaiting_human),
        mode: textoOuNull(heartbeat.mode),
        aiEnabled: typeof heartbeat.ai_enabled === 'boolean' ? heartbeat.ai_enabled : null,
        lastEchoAt: textoOuNull(heartbeat.last_echo_at),
        lastPollingAt: textoOuNull(heartbeat.last_polling_at),
      },
      // Stubbed until Fase 4 Task 4 (Instagram overview) lands.
      instagram: { connected: false, tokenStatus: null },
      metaAds: {
        connected: Boolean(metaAdsCredential),
        tokenStatus: metaAdsCredential?.sync_status ?? null,
      },
    };
  }
}
