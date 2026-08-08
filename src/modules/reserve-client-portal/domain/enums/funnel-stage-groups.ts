import { EFunnelStage } from '../../../../generated/prisma/enums';

/**
 * Etapas do funil na ordem em que o lead avanca. E a ordem que o board do
 * painel usa para montar as colunas -- PERDIDO fecha a lista por ser saida do
 * funil, nao um estagio mais avancado que RESERVA_CONFIRMADA.
 */
export const FUNNEL_STAGES_IN_ORDER: EFunnelStage[] = [
  EFunnelStage.CONTATO_INICIADO,
  EFunnelStage.PUBLICO_IDENTIFICADO,
  EFunnelStage.QUALIFICADO,
  EFunnelStage.ACOMODACAO_APRESENTADA,
  EFunnelStage.OFERTA_FEITA,
  EFunnelStage.FECHAMENTO_INICIADO,
  EFunnelStage.COMPROVANTE_RECEBIDO,
  EFunnelStage.RESERVA_CONFIRMADA,
  EFunnelStage.PERDIDO,
];

/** Entrada do funil: todo contato comeca aqui quando ainda nao ha BotLead. */
export const FUNNEL_ENTRY_STAGE: EFunnelStage = EFunnelStage.CONTATO_INICIADO;

/** Saida por perda. Unico estagio que exige "motivo" na escrita. */
export const FUNNEL_LOST_STAGE: EFunnelStage = EFunnelStage.PERDIDO;

/** Fechamento ganho, para leitura de "converteu". */
export const FUNNEL_WON_STAGE: EFunnelStage = EFunnelStage.RESERVA_CONFIRMADA;

/**
 * Etapas que contam como "lead qualificado" para metricas: QUALIFICADO e tudo
 * que vem depois dele no funil, exceto PERDIDO. Um lead que avancou ate
 * OFERTA_FEITA passou por qualificacao mesmo que o evento de QUALIFICADO nao
 * tenha sido registrado (o bot pode pular etapas), entao a leitura e "chegou a
 * QUALIFICADO ou alem", nao "igual a QUALIFICADO".
 */
export const QUALIFIED_OR_BEYOND_STAGES: EFunnelStage[] = FUNNEL_STAGES_IN_ORDER.slice(
  FUNNEL_STAGES_IN_ORDER.indexOf(EFunnelStage.QUALIFICADO),
  FUNNEL_STAGES_IN_ORDER.indexOf(EFunnelStage.PERDIDO),
);
