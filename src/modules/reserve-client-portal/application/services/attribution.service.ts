import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { AttributionSettingsService } from './attribution-settings.service';
import { EAttributionSource } from '../../../../generated/prisma/enums';

export interface IRecordAttributionInput {
  /** event_id do ledger do bot: torna o registro idempotente num replay da projecao. */
  sourceEventId?: string;
  numeroContato: string;
  ocorridoEm: Date;
  ctwaClid?: string;
  sourceId?: string;
  sourceType?: string;
  sourceUrl?: string;
  linkCode?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

/**
 * §6.4 "modelo de atribuição: último toque como padrão... primeiro toque
 * registrado para análise interna." Ships now as a standalone, fully-built
 * write path even though nothing calls it until Fase 3 Task 4 wires the bot
 * event processor's conversa.iniciada handler to it.
 */
@Injectable()
export class AttributionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attributionSettingsService: AttributionSettingsService,
  ) {}

  async record(tenantId: string, input: IRecordAttributionInput): Promise<void> {
    const settings = await this.attributionSettingsService.getOrDefault(tenantId);
    const fonte = this.resolveFonte(input, settings.source_priority);

    // priorCount is read and acted on inside the same transaction (not before
    // it) so two concurrent conversa.iniciada events for a brand-new contact
    // can't both observe count===0 and both write primeiro_toque:true.
    await this.prisma.$transaction(async (tx) => {
      // Replay da projecao do bot: o evento ja gerou a sua atribuicao.
      if (input.sourceEventId) {
        const existing = await tx.conversationAttribution.findFirst({
          where: { tenant_id: tenantId, source_event_id: input.sourceEventId },
          select: { id: true },
        });
        if (existing) return;
      }

      const priorCount = await tx.conversationAttribution.count({
        where: { tenant_id: tenantId, numero_contato: input.numeroContato },
      });

      await tx.conversationAttribution.updateMany({
        where: {
          tenant_id: tenantId,
          numero_contato: input.numeroContato,
          ultimo_toque: true,
        },
        data: { ultimo_toque: false },
      });

      await tx.conversationAttribution.create({
        data: {
          tenant_id: tenantId,
          numero_contato: input.numeroContato,
          ocorrido_em: input.ocorridoEm,
          fonte,
          // Meta's referral payload only gives a generic ad/post source_id, not a
          // distinct ad_id/adset_id/campaign_id triad. Stored as campaign_id since
          // that is the join key Fase 2 Task 5's per-campaign rollup depends on;
          // ad_id/adset_id stay null pending a richer ingestion payload.
          campaign_id: input.sourceId ?? null,
          ctwa_clid: input.ctwaClid ?? null,
          link_code: input.linkCode ?? null,
          utm_source: input.utmSource ?? null,
          utm_medium: input.utmMedium ?? null,
          utm_campaign: input.utmCampaign ?? null,
          primeiro_toque: priorCount === 0,
          ultimo_toque: true,
          source_event_id: input.sourceEventId ?? null,
        },
      });
    });
  }

  /**
   * source_priority (from AttributionSettings) breaks ties when a single
   * event carries more than one attribution signal at once. sourceType==='ad'
   * or a bare ctwaClid (ad click id present but source_type missing, which
   * Meta doesn't always populate) both count as an "anuncio" signal.
   */
  private resolveFonte(
    input: IRecordAttributionInput,
    sourcePriority: string[],
  ): EAttributionSource {
    const candidates: Record<string, boolean> = {
      anuncio: input.sourceType === 'ad' || Boolean(input.ctwaClid),
      link: Boolean(input.linkCode),
      site: Boolean(input.sourceUrl),
    };

    const order = sourcePriority.length ? sourcePriority : ['anuncio', 'link', 'site'];
    for (const source of order) {
      if (candidates[source]) return source as EAttributionSource;
    }
    return EAttributionSource.organico;
  }
}
