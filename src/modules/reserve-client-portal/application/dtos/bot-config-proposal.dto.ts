import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDefined, IsIn, IsNotEmpty, IsOptional, IsString, Length, MaxLength, ValidateBy, ValidationOptions,
} from 'class-validator';

/** B6: defesa em dobro — o bot ja recusa, mas a API nao aceita proposta para chave de credencial. */
export const CREDENTIAL_KEY_PATTERN = /(secret|segredo|token|senha|password|api[_-]?key|chave[_-]?api|credencial|credential|webhook)/i;

/** apply_config leva um valor simples (contrato v2 §6). */
function IsSimpleValue(options?: ValidationOptions) {
  return ValidateBy({
    name: 'isSimpleValue',
    validator: {
      validate: (v: unknown) => ['string', 'number', 'boolean'].includes(typeof v),
      defaultMessage: () => '$property deve ser texto, numero ou booleano',
    },
  }, options);
}

/** Recusa chaves com cara de credencial (CREDENTIAL_KEY_PATTERN). */
function IsNotCredentialKey(options?: ValidationOptions) {
  return ValidateBy({
    name: 'isNotCredentialKey',
    validator: {
      validate: (v: unknown) => typeof v === 'string' && !CREDENTIAL_KEY_PATTERN.test(v),
      defaultMessage: () => 'chave de credencial nao pode ser alterada por proposta',
    },
  }, options);
}

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
  @IsNotCredentialKey()
  campo: string;

  @ApiProperty({ description: 'Categoria (conjunto fechado: dados sim, comportamento nao).', enum: BOT_CONFIG_PROPOSAL_CATEGORIES, example: 'pricing' })
  @IsIn(BOT_CONFIG_PROPOSAL_CATEGORIES)
  categoria: BotConfigProposalCategory;

  // Sem decorator o whitelist do ValidationPipe descartaria estes campos.
  @ApiPropertyOptional({ description: 'Valor atual (valor simples).', oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }], nullable: true, example: 450 })
  @IsOptional() @IsSimpleValue()
  valor_atual?: string | number | boolean;

  @ApiProperty({ description: 'Valor simples (centavos para *_cents e tarifa:*; minutos para hold_min_*; "C" para calendario:*).', oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }], example: 33900 })
  @IsDefined() @IsSimpleValue()
  valor_proposto: string | number | boolean;

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
