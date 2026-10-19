import { ApiProperty } from '@nestjs/swagger';
import { EBotContactAudience, EFunnelStage } from '../../../../generated/prisma/enums';

/**
 * Formas de resposta das leituras do Bloco Bot do painel. Existem so para o
 * OpenAPI (o frontend gera tipos a partir delas); os services seguem devolvendo
 * objetos literais e o compilador nao checa a igualdade — manter em sincronia.
 */

export class BotMetricDto {
  @ApiProperty() value: number;
  @ApiProperty({ nullable: true, type: Number }) previous: number | null;
  @ApiProperty({ nullable: true, type: Number }) delta: number | null;
  @ApiProperty({ enum: ['auto', 'manual'] }) source: string;
}

// ---- GET hotel-portal/:clientId/leads-overview
export class LeadsByDayDto { @ApiProperty() date: string; @ApiProperty() count: number; }
export class LeadsByDeviceDto { @ApiProperty() device: string; @ApiProperty() count: number; }
export class LeadsByCityDto { @ApiProperty() city: string; @ApiProperty() count: number; }
export class LeadsCicloDto {
  @ApiProperty() cliques: number;
  @ApiProperty() conversas: number;
  @ApiProperty() reservas: number;
}
export class LeadsOverviewResponseDto {
  @ApiProperty({ type: BotMetricDto }) clicks: BotMetricDto;
  @ApiProperty({ type: [LeadsByDayDto] }) byDay: LeadsByDayDto[];
  @ApiProperty({ type: [LeadsByDeviceDto] }) byDevice: LeadsByDeviceDto[];
  @ApiProperty({ type: [LeadsByCityDto] }) byCity: LeadsByCityDto[];
  @ApiProperty({ type: LeadsCicloDto }) ciclo: LeadsCicloDto;
}

// ---- GET hotel-portal/:clientId/whatsapp/channels
export class WhatsAppChannelDto {
  @ApiProperty() connected: boolean;
  @ApiProperty() botEnabled: boolean;
  @ApiProperty({ nullable: true, type: Number }) heartbeatAgeMinutes: number | null;
  @ApiProperty() heartbeatStale: boolean;
  @ApiProperty() activeConversations: number;
  @ApiProperty() pausedAwaitingHuman: number;
  @ApiProperty({ nullable: true, type: String }) mode: string | null;
  @ApiProperty({ nullable: true, type: Boolean }) aiEnabled: boolean | null;
  @ApiProperty({ nullable: true, type: String }) lastEchoAt: string | null;
  @ApiProperty({ nullable: true, type: String }) lastPollingAt: string | null;
}
export class SocialChannelDto {
  @ApiProperty() connected: boolean;
  @ApiProperty({ nullable: true, type: String }) tokenStatus: string | null;
}
export class ChannelsResponseDto {
  @ApiProperty({ type: WhatsAppChannelDto }) whatsapp: WhatsAppChannelDto;
  @ApiProperty({ type: SocialChannelDto }) instagram: SocialChannelDto;
  @ApiProperty({ type: SocialChannelDto }) metaAds: SocialChannelDto;
}

// ---- GET hotel-portal/:clientId/whatsapp/conversations (+ detalhe)
export class ConversationHoldDto {
  @ApiProperty({ nullable: true, type: String }) codigo: string | null;
  @ApiProperty({ nullable: true, type: String }) status: string | null;
  @ApiProperty({ nullable: true, type: String }) acomodacao: string | null;
  @ApiProperty({ nullable: true, type: String }) checkIn: string | null;
  @ApiProperty({ nullable: true, type: String }) checkOut: string | null;
  @ApiProperty({ nullable: true, type: Number }) valor: number | null;
}
export class ConversationSummaryDto {
  @ApiProperty() numeroContato: string;
  @ApiProperty({ nullable: true, type: String }) nome: string | null;
  @ApiProperty() statusBot: string;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) lastMessageAt: Date | null;
  @ApiProperty() consentimentoLgpd: boolean;
  @ApiProperty({ nullable: true, enum: EBotContactAudience }) tipoPublico: EBotContactAudience | null;
  @ApiProperty({ nullable: true, type: String, description: 'anuncio | organico' }) origem: string | null;
  @ApiProperty({ nullable: true, type: String }) sourceId: string | null;
  @ApiProperty({ enum: EFunnelStage }) currentStage: EFunnelStage;
  @ApiProperty({ description: 'Abre a conversa no WhatsApp Web da pousada.' }) whatsappWebLink: string;
}
export class ConversationsListResponseDto {
  @ApiProperty({ type: [ConversationSummaryDto] }) conversations: ConversationSummaryDto[];
}
export class ConversationDetailContactDto extends ConversationSummaryDto {
  @ApiProperty({ nullable: true, type: String }) ocasiao: string | null;
  @ApiProperty({ nullable: true, type: ConversationHoldDto }) hold: ConversationHoldDto | null;
}
export class ConversationMessageDto {
  @ApiProperty() role: string;
  @ApiProperty() tipo: string;
  @ApiProperty({ nullable: true, type: String, description: 'Previa de ate 180 caracteres (lista).' }) contentPreview: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Texto inteiro da mensagem.' }) content: string | null;
  @ApiProperty({ nullable: true, type: String }) mediaKind: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Transcricao do audio ou descricao da midia.' }) mediaText: string | null;
  @ApiProperty({ nullable: true, type: String }) caption: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) ocorridoEm: Date;
}
export class ConversationDetailResponseDto {
  @ApiProperty({ type: ConversationDetailContactDto }) contact: ConversationDetailContactDto;
  @ApiProperty({ type: [ConversationMessageDto] }) messages: ConversationMessageDto[];
  @ApiProperty({ description: 'Ha mensagens mais antigas que as devolvidas.' }) hasMore: boolean;
}

// ---- GET hotel-portal/:clientId/whatsapp/funnel (board)
export class FunnelLeadCardDto {
  @ApiProperty() numeroContato: string;
  @ApiProperty({ nullable: true, type: String }) nome: string | null;
  @ApiProperty({ nullable: true, enum: EBotContactAudience }) tipoPublico: EBotContactAudience | null;
  @ApiProperty({ nullable: true, type: String, description: 'anuncio | organico' }) origem: string | null;
  @ApiProperty({ nullable: true, type: String }) sourceId: string | null;
  @ApiProperty({ nullable: true, type: String }) acomodacaoInteresse: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Texto de apresentacao das datas.' }) datasInteresse: string | null;
  @ApiProperty() statusBot: string;
  @ApiProperty({ nullable: true, type: String, description: 'Ultima mensagem do hospede (ISO).' }) aguardandoDesde: string | null;
  @ApiProperty({ nullable: true, type: Number, description: 'Valor da cotacao em reais.' }) valorCotacao: number | null;
  @ApiProperty({ nullable: true, enum: ['RECUPERAR'] }) etiqueta: 'RECUPERAR' | null;
  @ApiProperty({ nullable: true, type: String }) motivoPerda: string | null;
  @ApiProperty({ nullable: true, type: String }) holdStatus: string | null;
  @ApiProperty({ nullable: true, type: String }) holdCodigo: string | null;
}
export class FunnelColumnDto {
  @ApiProperty({ enum: EFunnelStage }) stage: EFunnelStage;
  @ApiProperty() count: number;
  @ApiProperty({ description: 'Soma dos holds em aberto, em reais.' }) valorAberto: number;
  @ApiProperty({ description: 'Soma dos valores confirmados, em reais.' }) valorConfirmado: number;
  @ApiProperty({ type: [FunnelLeadCardDto] }) leads: FunnelLeadCardDto[];
}

// ---- GET hotel-portal/:clientId/whatsapp/funnel/metrics
export class StageCountDto { @ApiProperty() stage: string; @ApiProperty() count: number; }
export class StageAvgSecondsDto { @ApiProperty() stage: string; @ApiProperty() avgSeconds: number; }
export class StageConversionDto {
  @ApiProperty() stage: string;
  @ApiProperty() count: number;
  @ApiProperty() rate: number;
}
export class FollowupEffectivenessDto {
  @ApiProperty() regua: string;
  @ApiProperty() status: string;
  @ApiProperty() count: number;
}
export class OrigemVolumeDto { @ApiProperty() origem: string; @ApiProperty() count: number; }
export class AnuncioVolumeDto { @ApiProperty() sourceId: string; @ApiProperty() count: number; }
export class HandoffMotivoDto { @ApiProperty() motivo: string; @ApiProperty() count: number; }
export class HandoffMetricsDto {
  @ApiProperty() total: number;
  @ApiProperty({ type: [HandoffMotivoDto] }) motivos: HandoffMotivoDto[];
  @ApiProperty({ nullable: true, type: Number }) tempoMedioComBotSegundos: number | null;
  @ApiProperty() taxaHandover: number;
}
export class FunnelMetricsResponseDto {
  @ApiProperty({ type: BotMetricDto }) conversasIniciadas: BotMetricDto;
  @ApiProperty() taxaRespostaBot: number;
  @ApiProperty({ nullable: true, type: Number }) tempoMedioPrimeiraRespostaSegundos: number | null;
  @ApiProperty({ type: [StageCountDto] }) distribuicaoFunil: StageCountDto[];
  @ApiProperty({ type: [StageAvgSecondsDto] }) tempoMedioPorEstagioSegundos: StageAvgSecondsDto[];
  @ApiProperty() taxaQualificacao: number;
  @ApiProperty() leadsProntos: number;
  @ApiProperty({ type: [StageConversionDto] }) taxaConversaoPorEtapa: StageConversionDto[];
  @ApiProperty({ type: [FollowupEffectivenessDto] }) efetividadeFollowup: FollowupEffectivenessDto[];
  @ApiProperty({ type: [OrigemVolumeDto] }) volumePorOrigem: OrigemVolumeDto[];
  @ApiProperty({ type: [AnuncioVolumeDto] }) conversasPorAnuncio: AnuncioVolumeDto[];
  @ApiProperty() contatosPausados: number;
  @ApiProperty() audiosTranscritos: number;
  @ApiProperty({ type: HandoffMetricsDto }) handoff: HandoffMetricsDto;
}

// ---- GET hotel-portal/:clientId/home (o corpo e `data` do envelope successResponse)
export class HomeBotRecuperarDto {
  @ApiProperty() quantidade: number;
  @ApiProperty() valor: number;
}
export class HomeBotDto {
  @ApiProperty({ description: 'Receita confirmada pelo bot, em reais.' }) receitaConfirmada: number;
  @ApiProperty() reservas: number;
  @ApiProperty({ type: HomeBotRecuperarDto }) aRecuperar: HomeBotRecuperarDto;
}
export class HomePeriodDto {
  @ApiProperty() from: string;
  @ApiProperty() to: string;
}
export class HomeResponseDto {
  @ApiProperty({ type: HomePeriodDto }) period: HomePeriodDto;
  @ApiProperty({ type: FunnelMetricsResponseDto }) funil: FunnelMetricsResponseDto;
  @ApiProperty({ type: 'object', additionalProperties: true, description: 'Metricas do motor de reservas.' }) motor: Record<string, unknown>;
  @ApiProperty({ type: HomeBotDto }) bot: HomeBotDto;
}
