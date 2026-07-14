import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { EPlatform, EBotContactStatus } from '../../../../generated/prisma/enums';

const HEARTBEAT_STALE_MINUTES = 90;
const ACTIVE_CONVERSATION_WINDOW_HOURS = 24;

/** §8 Fase 3 "Bloco Canais" — WhatsApp bot / Instagram / Meta Ads health at a glance. */
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

    let activeConversations = 0;
    let pausedAwaitingHuman = 0;
    if (tenantId) {
      const activeSince = new Date(Date.now() - ACTIVE_CONVERSATION_WINDOW_HOURS * 60 * 60 * 1000);
      [activeConversations, pausedAwaitingHuman] = await Promise.all([
        this.prisma.botContact.count({
          where: { tenant_id: tenantId, last_message_at: { gte: activeSince } },
        }),
        this.prisma.botContact.count({
          where: { tenant_id: tenantId, status_bot: EBotContactStatus.PAUSADO },
        }),
      ]);
    }

    const heartbeatAgeMinutes = botConfig?.last_heartbeat_at
      ? Math.floor((Date.now() - botConfig.last_heartbeat_at.getTime()) / 60000)
      : null;
    const heartbeatStale = heartbeatAgeMinutes === null || heartbeatAgeMinutes > HEARTBEAT_STALE_MINUTES;

    return {
      whatsapp: {
        connected: Boolean(botConfig?.active),
        botEnabled: Boolean(botConfig?.active),
        heartbeatAgeMinutes,
        heartbeatStale,
        activeConversations,
        pausedAwaitingHuman,
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
