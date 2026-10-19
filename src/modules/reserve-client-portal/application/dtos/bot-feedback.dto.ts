import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsOptional, Max, Min } from 'class-validator';

export const BOT_FEEDBACK_SENTIMENTOS = ['positivo', 'neutro', 'negativo'] as const;
export type BotFeedbackSentimento = (typeof BOT_FEEDBACK_SENTIMENTOS)[number];

export const BOT_FEEDBACK_LIST_DEFAULT_LIMIT = 50;
export const BOT_FEEDBACK_LIST_MAX_LIMIT = 200;

// ---- Entradas

/** Periodo comum a lista e ao resumo (ISO, filtra por ocorrido_em). */
export class BotFeedbackSummaryQueryDto {
  @ApiPropertyOptional({ description: 'ISO: so feedbacks com ocorrido_em a partir deste instante.' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO: so feedbacks com ocorrido_em ate este instante.' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}

export class BotFeedbackListQueryDto extends BotFeedbackSummaryQueryDto {
  @ApiPropertyOptional({ enum: BOT_FEEDBACK_SENTIMENTOS })
  @IsOptional()
  @IsIn(BOT_FEEDBACK_SENTIMENTOS)
  sentimento?: BotFeedbackSentimento;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: BOT_FEEDBACK_LIST_MAX_LIMIT, default: BOT_FEEDBACK_LIST_DEFAULT_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(BOT_FEEDBACK_LIST_MAX_LIMIT)
  limit?: number;
}

// ---- Respostas

export class BotFeedbackItemDto {
  @ApiProperty() id: string;
  @ApiProperty() numeroContato: string;
  @ApiProperty({ nullable: true, type: String }) nomeContato: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Texto livre do hospede.' }) texto: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Resumo curto feito pelo bot.' }) resumo: string | null;
  @ApiProperty({ nullable: true, type: Number, description: 'Nota de 0 a 10; nulo quando o hospede nao deu nota.' })
  nota: number | null;
  @ApiProperty({ enum: BOT_FEEDBACK_SENTIMENTOS }) sentimento: string;
  @ApiProperty({ nullable: true, type: String, description: 'Data do check-out da reserva (YYYY-MM-DD).' })
  checkOut: string | null;
  @ApiProperty({ description: 'O bot ja enviou o link de avaliacao publica.' }) linkEnviado: boolean;
  @ApiProperty({ type: String, format: 'date-time' }) ocorridoEm: Date;
}

export class BotFeedbackListResponseDto {
  @ApiProperty({ type: [BotFeedbackItemDto] }) items: BotFeedbackItemDto[];
  @ApiProperty({ description: 'Total que bate com os filtros (sem paginacao).' }) total: number;
}

export class BotFeedbackSentimentoCountDto {
  @ApiProperty() positivo: number;
  @ApiProperty() neutro: number;
  @ApiProperty() negativo: number;
}

export class BotFeedbackSummaryResponseDto {
  @ApiProperty() total: number;
  @ApiProperty({ type: BotFeedbackSentimentoCountDto }) porSentimento: BotFeedbackSentimentoCountDto;
  @ApiProperty({ nullable: true, type: Number, description: 'Media das notas informadas; nulo sem nenhuma nota.' })
  notaMedia: number | null;
  @ApiProperty({ type: [BotFeedbackItemDto], description: 'Top 3: positivos primeiro, maior nota, mais recente.' })
  melhores: BotFeedbackItemDto[];
  @ApiProperty({ type: [BotFeedbackItemDto], description: 'Top 3: negativos primeiro, menor nota, mais recente.' })
  piores: BotFeedbackItemDto[];
}
