import { IsIn, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

/**
 * §5.5's "dados sim, comportamento não" boundary, enforced server-side: this
 * is the closed set the API accepts — there is no 'behavior' or
 * 'system_prompt' category, so trusting the client to only ever send safe
 * categories is never the only line of defense.
 */
export const BOT_CONFIG_PROPOSAL_CATEGORIES = ['pricing', 'policies', 'packages', 'hours'] as const;
export type BotConfigProposalCategory = (typeof BOT_CONFIG_PROPOSAL_CATEGORIES)[number];

export class CreateBotConfigProposalDto {
  @IsString()
  @Length(1, 100)
  campo: string;

  @IsIn(BOT_CONFIG_PROPOSAL_CATEGORIES)
  categoria: BotConfigProposalCategory;

  @IsOptional()
  valor_atual?: any;

  valor_proposto: any;
}

export class RejectBotConfigProposalDto {
  // §5.5: "REJEITADA: volta com justificativa" — enforced as a required,
  // non-empty field at the DTO level, not just a UI hint.
  @IsString()
  @IsNotEmpty()
  justificativa: string;
}
