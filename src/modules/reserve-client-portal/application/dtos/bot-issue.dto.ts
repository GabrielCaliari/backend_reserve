import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const BOT_ISSUE_CATEGORIAS = ['tecnico', 'conversa', 'socorro'] as const;
export type BotIssueCategoria = (typeof BOT_ISSUE_CATEGORIAS)[number];

export const BOT_ISSUE_GRAVIDADES = ['alta', 'media', 'baixa'] as const;
export type BotIssueGravidade = (typeof BOT_ISSUE_GRAVIDADES)[number];

export const BOT_ISSUE_STATUS = ['ABERTO', 'VISTO', 'CORRIGIDO'] as const;
export type BotIssueStatus = (typeof BOT_ISSUE_STATUS)[number];

export const BOT_ISSUE_LIST_DEFAULT_LIMIT = 50;
export const BOT_ISSUE_LIST_MAX_LIMIT = 200;

// ---- Entradas

/** Periodo comum a lista e ao resumo (ISO, filtra por ocorrido_em). */
export class BotIssueSummaryQueryDto {
  @ApiPropertyOptional({ description: 'Instante ISO (gte exato) ou data YYYY-MM-DD (00:00 desse dia em America/Sao_Paulo).' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'Instante ISO (lte exato) ou data YYYY-MM-DD (inclui o dia inteiro em America/Sao_Paulo).' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}

export class BotIssueListQueryDto extends BotIssueSummaryQueryDto {
  @ApiPropertyOptional({ enum: BOT_ISSUE_CATEGORIAS })
  @IsOptional()
  @IsIn(BOT_ISSUE_CATEGORIAS)
  categoria?: BotIssueCategoria;

  @ApiPropertyOptional({ description: 'Codigo do erro (ex.: excecao, revisor_corrigiu).' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  codigo?: string;

  @ApiPropertyOptional({ enum: BOT_ISSUE_STATUS })
  @IsOptional()
  @IsIn(BOT_ISSUE_STATUS)
  status?: BotIssueStatus;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: BOT_ISSUE_LIST_MAX_LIMIT, default: BOT_ISSUE_LIST_DEFAULT_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(BOT_ISSUE_LIST_MAX_LIMIT)
  limit?: number;
}

export class UpdateBotIssueStatusDto {
  @ApiProperty({ enum: BOT_ISSUE_STATUS })
  @IsIn(BOT_ISSUE_STATUS)
  status: BotIssueStatus;
}

// ---- Respostas

export class BotIssueItemDto {
  @ApiProperty() id: string;
  @ApiProperty({ nullable: true, type: String }) numeroContato: string | null;
  @ApiProperty({ nullable: true, type: String }) nomeContato: string | null;
  @ApiProperty({ enum: BOT_ISSUE_CATEGORIAS }) categoria: string;
  @ApiProperty() codigo: string;
  @ApiProperty({ enum: BOT_ISSUE_GRAVIDADES }) gravidade: string;
  @ApiProperty({ nullable: true, type: String }) etapa: string | null;
  @ApiProperty({ nullable: true, type: String }) workflow: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'No do workflow onde o erro aconteceu.' }) no: string | null;
  @ApiProperty({ nullable: true, type: String }) mensagem: string | null;
  @ApiProperty({ description: 'O bot pausou e passou a conversa para a equipe.' }) socorro: boolean;
  @ApiProperty({ enum: BOT_ISSUE_STATUS }) status: string;
  @ApiProperty({ type: String, format: 'date-time' }) ocorridoEm: Date;
}

export class BotIssueListResponseDto {
  @ApiProperty({ type: [BotIssueItemDto] }) items: BotIssueItemDto[];
  @ApiProperty({ description: 'Total que bate com os filtros (sem paginacao).' }) total: number;
}

export class BotIssueCodigoCountDto {
  @ApiProperty() codigo: string;
  @ApiProperty({ enum: BOT_ISSUE_CATEGORIAS }) categoria: string;
  @ApiProperty() quantidade: number;
}

export class BotIssueSummaryResponseDto {
  @ApiProperty() total: number;
  @ApiProperty({ type: [BotIssueCodigoCountDto], description: 'Top 10 codigos, do mais frequente ao menos.' })
  porCodigo: BotIssueCodigoCountDto[];
}

export class BotIssueUltimaMensagemDto {
  @ApiProperty({ description: 'Texto da mensagem.' }) m: string;
  @ApiProperty({ description: 'Quando, no formato enviado pelo bot (ex.: 19/10 10:00).' }) em: string;
  @ApiProperty({ description: 'Quem falou (user | assistant).' }) quem: string;
}

export class BotIssueDetailResponseDto extends BotIssueItemDto {
  @ApiProperty({ nullable: true, type: String }) mensagemHospede: string | null;
  @ApiProperty({ nullable: true, type: String }) respostaBot: string | null;
  @ApiProperty({ type: [BotIssueUltimaMensagemDto] }) ultimasMensagens: BotIssueUltimaMensagemDto[];
  @ApiProperty({ nullable: true, type: String, description: 'Link da execucao no n8n.' }) url: string | null;
}
