import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsIn, IsNotEmpty, IsOptional, IsString, Length, MaxLength } from 'class-validator';

/**
 * §5.5's "dados sim, comportamento não" boundary, enforced server-side: this
 * is the closed set the API accepts — there is no 'behavior' or
 * 'system_prompt' category, so trusting the client to only ever send safe
 * categories is never the only line of defense.
 */
export const BOT_CONFIG_PROPOSAL_CATEGORIES = ['pricing', 'policies', 'packages', 'hours'] as const;
export type BotConfigProposalCategory = (typeof BOT_CONFIG_PROPOSAL_CATEGORIES)[number];

export class CreateBotConfigProposalDto {
  @ApiProperty({ description: 'Chave do campo de configuracao proposto.', maxLength: 100, example: 'pricing.diaria_base' })
  @IsString()
  @Length(1, 100)
  campo: string;

  @ApiProperty({ description: 'Categoria (conjunto fechado: dados sim, comportamento nao).', enum: BOT_CONFIG_PROPOSAL_CATEGORIES, example: 'pricing' })
  @IsIn(BOT_CONFIG_PROPOSAL_CATEGORIES)
  categoria: BotConfigProposalCategory;

  // Sem decorator o whitelist do ValidationPipe descartaria estes campos.
  @ApiPropertyOptional({ description: 'Valor atual (qualquer JSON).', type: 'object', additionalProperties: true, nullable: true, example: 450 })
  @IsOptional()
  valor_atual?: unknown;

  @ApiProperty({ description: 'Valor proposto (qualquer JSON, obrigatorio).', type: 'object', additionalProperties: true, example: 480 })
  @IsDefined()
  valor_proposto: unknown;

  /** Por que o cliente quer a mudanca (contrato v2 §6, passo 1). */
  @ApiPropertyOptional({ description: 'Por que o cliente quer a mudanca.', maxLength: 1000, example: 'Alta temporada' })
  @IsOptional() @IsString() @MaxLength(1000)
  justificativa?: string;
}

export class RejectBotConfigProposalDto {
  // §5.5: "REJEITADA: volta com justificativa" — enforced as a required,
  // non-empty field at the DTO level, not just a UI hint.
  @ApiProperty({ description: 'Justificativa da rejeicao (obrigatoria).', example: 'Valor fora da politica comercial' })
  @IsString()
  @IsNotEmpty()
  justificativa: string;
}
