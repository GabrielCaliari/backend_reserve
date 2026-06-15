import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { AttributionSettingsService } from './attribution-settings.service';
import { EAttributionSource } from '../../../../generated/prisma/enums';

export interface IRecordAttributionInput {
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

    const priorCount = await this.prisma.conversationAttribution.count({
      where: { tenant_id: tenantId, numero_contato: input.numeroContato },
    });

    await this.prisma.$transaction([
      this.prisma.conversationAttribution.updateMany({
        where: {
          tenant_id: tenantId,
          numero_contato: input.numeroContato,
          ultimo_toque: true,
        },
        data: { ultimo_toque: false },
      }),
      this.prisma.conversationAttribution.create({
        data: {
          tenant_id: tenantId,
          numero_contato: input.numeroContato,
          ocorrido_em: input.ocorridoEm,
          fonte,
          // Meta's referral payload only ever gives a generic ad/post id, not a
          // full campaign_id — stored here as ad_id. Resolving ad_id -> campaign_id
          // (needed by Fase 2 Task 5's per-campaign rollup) requires a separate
          // Meta Ads campaign-structure join that is out of this task's scope.
          ad_id: input.sourceId ?? null,
          ctwa_clid: input.ctwaClid ?? null,
          link_code: input.linkCode ?? null,
          utm_source: input.utmSource ?? null,
          utm_medium: input.utmMedium ?? null,
          utm_campaign: input.utmCampaign ?? null,
          primeiro_toque: priorCount === 0,
          ultimo_toque: true,
        },
      }),
    ]);
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
