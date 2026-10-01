import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { AttributionService } from './attribution.service';
import { BotEventV2Dto } from '../dtos/bot-event.dto';
import {
  EBotContactAudience,
  EBotContactStatus,
  EBotMessageRole,
  EBotMessageType,
  EFunnelStage,
} from '../../../../generated/prisma/enums';
import { FUNNEL_ENTRY_STAGE } from '../../domain/enums/funnel-stage-groups';

/** Contrato v2 §8: o painel so guarda uma previa da mensagem. */
const CONTENT_PREVIEW_MAX_LENGTH = 180;
/** Espelha o VarChar(255) de funil_eventos.motivo. */
const MOTIVO_MAX_LENGTH = 255;
/** Tipos que viram a etiqueta RECUPERAR no card (contrato §3.5 e §4.3). */
const TIPOS_RECUPERAR = new Set(['hold.expirado', 'followup.regua_esgotada', 'followup.fora_da_janela']);
/**
 * Tipos que nao sao de um contato: reservas vistas no PMS que nao vieram do
 * bot (site, OTA, balcao) e o eco de configuracao. Ficam so no ledger.
 */
const TIPOS_SEM_CONTATO = new Set([
  'reserva.detectada_polling',
  'reserva.alterada_polling',
  'reserva.cancelada_polling',
  'config.aplicada',
]);

type Json = Record<string, unknown>;

interface ContactSnapshot {
  phone: string;
  name: string | null;
  audience: EBotContactAudience | null;
  origin: string | null;
  ctwaClid: string | null;
  sourceId: string | null;
  linkCode: string | null;
  botStatus: EBotContactStatus | null;
  occasion: string | null;
}

function texto(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const limpo = value.trim();
  return limpo ? limpo.slice(0, max) : null;
}

function enumValue<T extends string>(enumObj: Record<string, T>, value: unknown): T | null {
  if (typeof value !== 'string') return null;
  return enumObj[value] ?? enumObj[value.toUpperCase()] ?? null;
}

/**
 * Projetor do contrato Bot <-> Painel v2 (§3.4/§3.5). O painel nunca le o banco
 * do bot: o estado de um contato e o snapshot do evento mais recente dele. Por
 * isso contato, estagio e hold carregam cada um o seu carimbo (`snapshot_em`,
 * `stage_em`, `hold_em`) — um evento que chega atrasado nao desfaz o que um
 * evento mais novo ja escreveu.
 */
@Injectable()
export class BotEventProcessorService {
  private readonly logger = new Logger(BotEventProcessorService.name);

  /** Prefixo do motivo de escalacao no log do funil; as metricas agregam por ele. */
  static readonly HANDOFF_MOTIVO_PREFIX = 'HANDOFF:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly attributionService: AttributionService,
  ) {}

  async process(tenantId: string, event: BotEventV2Dto): Promise<void> {
    const occurredAt = new Date(event.occurred_at);
    const data = (event.data ?? {}) as Json;

    if (event.type === 'heartbeat') {
      await this.prisma.botIntegrationConfig.updateMany({
        where: { tenant_id: tenantId },
        data: { last_heartbeat_at: occurredAt, last_heartbeat_data: data as object },
      });
      return;
    }

    const snapshot = this.parseContact(event.contact);
    if (!snapshot) {
      if (!TIPOS_SEM_CONTATO.has(event.type)) {
        this.logger.warn(`Evento "${event.type}" sem contact.phone (tenant=${tenantId}, event=${event.event_id})`);
      }
      return;
    }
    const phone = snapshot.phone;

    await this.applyContactSnapshot(tenantId, snapshot, occurredAt);
    if (event.hold) await this.applyHold(tenantId, phone, event.hold as Json, occurredAt);
    if (event.stage) {
      const actor = (event.actor ?? {}) as Json;
      await this.applyStage(
        tenantId,
        phone,
        event.stage,
        occurredAt,
        actor.type === 'human' ? 'humano' : 'bot',
        texto(actor.id, 25),
        texto(data.motivo, MOTIVO_MAX_LENGTH),
      );
    }

    if (TIPOS_RECUPERAR.has(event.type)) {
      await this.patchLead(tenantId, phone, { recuperar: true });
      return;
    }

    switch (event.type) {
      case 'contato.iniciado':
        return this.handleContatoIniciado(tenantId, snapshot, data, occurredAt);
      case 'mensagem':
        return this.handleMensagem(tenantId, phone, data, occurredAt);
      case 'transferencia':
        return this.handleTransferencia(tenantId, phone, data, occurredAt);
      case 'reserva.confirmada':
        return this.handleReservaConfirmada(tenantId, phone, data, event.hold as Json | null);
      case 'perdido':
        return this.patchLead(tenantId, phone, { motivo_perda: texto(data.motivo, MOTIVO_MAX_LENGTH) });
      case 'followup.enviado':
        return this.handleFollowupEnviado(tenantId, phone, data, occurredAt);
      default:
        // Os demais tipos do catalogo so carregam snapshot/estagio/hold (ja
        // aplicados) ou sao lidos direto do ledger (ex.: audio.transcrito).
        return;
    }
  }

  private parseContact(raw: unknown): ContactSnapshot | null {
    if (!raw || typeof raw !== 'object') return null;
    const c = raw as Json;
    const phone = texto(c.phone, 20);
    if (!phone) return null;
    return {
      phone,
      name: texto(c.name, 150),
      audience: enumValue(EBotContactAudience as Record<string, EBotContactAudience>, c.audience),
      origin: texto(c.origin, 20),
      ctwaClid: texto(c.ctwa_clid, 255),
      sourceId: texto(c.source_id, 100),
      linkCode: texto(c.link_code, 20),
      botStatus: enumValue(EBotContactStatus as Record<string, EBotContactStatus>, c.bot_status),
      occasion: texto(c.occasion, 20),
    };
  }

  private async applyContactSnapshot(tenantId: string, s: ContactSnapshot, occurredAt: Date): Promise<void> {
    // Campo ausente no snapshot nao apaga o que ja se sabe; `ocasiao` e a
    // excecao: e parte do snapshot e pode voltar a null.
    const campos = {
      ...(s.name ? { nome: s.name } : {}),
      ...(s.audience ? { tipo_publico: s.audience } : {}),
      ...(s.origin ? { origem: s.origin } : {}),
      ...(s.botStatus ? { status_bot: s.botStatus } : {}),
      ...(s.ctwaClid ? { ctwa_clid: s.ctwaClid } : {}),
      ...(s.sourceId ? { source_id: s.sourceId } : {}),
      ...(s.linkCode ? { link_code: s.linkCode } : {}),
      ocasiao: s.occasion,
      snapshot_em: occurredAt,
    };

    await this.prisma.botContact.upsert({
      where: { tenant_id_numero_contato: { tenant_id: tenantId, numero_contato: s.phone } },
      create: { tenant_id: tenantId, numero_contato: s.phone, ...campos },
      update: {},
    });
    await this.prisma.botContact.updateMany({
      where: {
        tenant_id: tenantId,
        numero_contato: s.phone,
        OR: [{ snapshot_em: null }, { snapshot_em: { lte: occurredAt } }],
      },
      data: campos,
    });
  }

  private leadWhere(tenantId: string, phone: string) {
    return { tenant_id_numero_contato: { tenant_id: tenantId, numero_contato: phone } };
  }

  /** Atualiza colunas do lead criando-o na entrada do funil se ainda nao existir. */
  private async patchLead(tenantId: string, phone: string, data: Json): Promise<void> {
    await this.prisma.botLead.upsert({
      where: this.leadWhere(tenantId, phone),
      create: { tenant_id: tenantId, numero_contato: phone, current_stage: FUNNEL_ENTRY_STAGE, ...data },
      update: data,
    });
  }

  private async applyStage(
    tenantId: string,
    phone: string,
    stageRaw: string,
    occurredAt: Date,
    autorTipo: 'bot' | 'humano',
    autorId: string | null,
    motivo: string | null,
  ): Promise<void> {
    const stage = enumValue(EFunnelStage as Record<string, EFunnelStage>, stageRaw);
    if (!stage) {
      this.logger.warn(`Estagio desconhecido "${stageRaw}" ignorado (tenant=${tenantId}, contato=${phone})`);
      return;
    }

    const where = this.leadWhere(tenantId, phone);
    const lead = await this.prisma.botLead.findUnique({ where });
    if (lead?.stage_em && lead.stage_em.getTime() > occurredAt.getTime()) return;

    // Eco de uma acao que o painel ja gravou (ou reenvio): mesmo estagio nao
    // gera linha no log — duplicaria a transicao nas metricas.
    if (lead && lead.current_stage === stage) {
      await this.prisma.botLead.update({ where, data: { stage_em: occurredAt } });
      return;
    }

    await this.prisma.$transaction([
      this.prisma.funnelEvent.create({
        data: {
          tenant_id: tenantId,
          numero_contato: phone,
          de_estagio: lead?.current_stage ?? null,
          para_estagio: stage,
          autor_tipo: autorTipo,
          autor_id: autorId,
          motivo,
          ocorrido_em: occurredAt,
        },
      }),
      this.prisma.botLead.upsert({
        where,
        create: { tenant_id: tenantId, numero_contato: phone, current_stage: stage, stage_em: occurredAt },
        update: { current_stage: stage, stage_em: occurredAt },
      }),
    ]);
  }

  private async applyHold(tenantId: string, phone: string, hold: Json, occurredAt: Date): Promise<void> {
    const lead = await this.prisma.botLead.findUnique({ where: this.leadWhere(tenantId, phone) });
    if (lead?.hold_em && lead.hold_em.getTime() > occurredAt.getTime()) return;

    const valor = Number(hold.amount_cents);
    const checkIn = texto(hold.check_in, 10);
    const checkOut = texto(hold.check_out, 10);
    await this.patchLead(tenantId, phone, {
      hold_codigo: texto(hold.code, 20),
      hold_status: texto(hold.status, 20),
      hold_valor_cents: Number.isFinite(valor) ? Math.round(valor) : null,
      hold_pms_reservation_id: texto(hold.pms_reservation_id, 60),
      acomodacao_interesse: texto(hold.accommodation, 255),
      ...(checkIn && checkOut ? { datas_interesse: { checkin: checkIn, checkout: checkOut } } : {}),
      hold_em: occurredAt,
    });
  }

  private async handleContatoIniciado(
    tenantId: string,
    s: ContactSnapshot,
    data: Json,
    occurredAt: Date,
  ): Promise<void> {
    await this.prisma.botContact.updateMany({
      where: { tenant_id: tenantId, numero_contato: s.phone, iniciado_em: null },
      data: { iniciado_em: occurredAt },
    });

    const origem = texto(data.origem, 20) ?? s.origin;
    await this.attributionService.record(tenantId, {
      numeroContato: s.phone,
      ocorridoEm: occurredAt,
      ctwaClid: texto(data.ctwa_clid, 255) ?? s.ctwaClid ?? undefined,
      sourceId: texto(data.source_id, 100) ?? s.sourceId ?? undefined,
      sourceType: origem === 'anuncio' ? 'ad' : undefined,
      linkCode: texto(data.link_code, 20) ?? s.linkCode ?? undefined,
    });
  }

  private async handleMensagem(tenantId: string, phone: string, data: Json, occurredAt: Date): Promise<void> {
    const role = enumValue(EBotMessageRole as Record<string, EBotMessageRole>, data.role) ?? EBotMessageRole.user;
    const tipo = enumValue(EBotMessageType as Record<string, EBotMessageType>, data.kind) ?? EBotMessageType.texto;

    await this.prisma.botMessage.create({
      data: {
        tenant_id: tenantId,
        numero_contato: phone,
        role,
        tipo,
        // Defesa em profundidade (LGPD): corta aqui independentemente do que o bot mandar.
        content_preview: String(data.content_preview ?? '').slice(0, CONTENT_PREVIEW_MAX_LENGTH),
        ocorrido_em: occurredAt,
      },
    });

    const where = { tenant_id: tenantId, numero_contato: phone };
    if (role !== EBotMessageRole.user) {
      await this.prisma.botContact.updateMany({ where, data: { last_message_at: occurredAt } });
      return;
    }

    await this.prisma.botContact.updateMany({
      where,
      data: { last_message_at: occurredAt, last_user_message_at: occurredAt },
    });
    // Contrato §4.4: o follow-up "respondeu" se o hospede falou depois do toque.
    await this.prisma.followupAttempt.updateMany({
      where: { ...where, status: 'sem_resposta', ocorrido_em: { lte: occurredAt } },
      data: { status: 'respondeu' },
    });
  }

  /**
   * Anotacao que nao muda estagio (de_estagio: null, para_estagio: o atual),
   * com o motivo da escalacao — e o que as metricas de handoff agregam.
   */
  private async handleTransferencia(tenantId: string, phone: string, data: Json, occurredAt: Date): Promise<void> {
    const motivo = texto(data.motivo, 100) ?? 'nao_informado';
    const lead = await this.prisma.botLead.findUnique({ where: this.leadWhere(tenantId, phone) });

    await this.prisma.funnelEvent.create({
      data: {
        tenant_id: tenantId,
        numero_contato: phone,
        de_estagio: null,
        para_estagio: lead?.current_stage ?? FUNNEL_ENTRY_STAGE,
        autor_tipo: 'bot',
        motivo: `${BotEventProcessorService.HANDOFF_MOTIVO_PREFIX}${motivo}`.slice(0, MOTIVO_MAX_LENGTH),
        ocorrido_em: occurredAt,
      },
    });
    await this.prisma.botContact.updateMany({
      where: { tenant_id: tenantId, numero_contato: phone },
      data: { motivo_pausa: motivo },
    });
  }

  private async handleReservaConfirmada(
    tenantId: string,
    phone: string,
    data: Json,
    hold: Json | null,
  ): Promise<void> {
    const valor = Number(data.valor_cents ?? hold?.amount_cents);
    await this.patchLead(tenantId, phone, {
      valor_confirmado_cents: Number.isFinite(valor) ? Math.round(valor) : 0,
      recuperar: false,
    });
  }

  private async handleFollowupEnviado(tenantId: string, phone: string, data: Json, occurredAt: Date): Promise<void> {
    const regua = texto(data.regua, 20) ?? 'desconhecida';
    await this.prisma.followupAttempt.create({
      data: {
        tenant_id: tenantId,
        numero_contato: phone,
        tentativa: Number(data.toque ?? 1) || 1,
        // Coluna legada VarChar(10) e obrigatoria; a regua completa vive em `regua`.
        tipo_janela: regua.slice(0, 10),
        regua,
        status: 'sem_resposta',
        ocorrido_em: occurredAt,
      },
    });
  }
}
