import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateSeasonDto {
  @IsString() @Length(1, 120) nome: string;
  @IsDateString() data_inicio: string;
  @IsDateString() data_fim: string;
  @IsOptional() @IsInt() prioridade?: number;
}

export class UpdateSeasonDto {
  @IsOptional() @IsString() @Length(1, 120) nome?: string;
  @IsOptional() @IsDateString() data_inicio?: string;
  @IsOptional() @IsDateString() data_fim?: string;
  @IsOptional() @IsInt() prioridade?: number;
}

export class CreatePriceRuleDto {
  @IsString() room_type_id: string;
  @IsOptional() @IsString() rate_plan_id?: string;
  @IsOptional() @IsString() season_id?: string;
  // bitmask seg=1 ... dom=64; 127 = todos os dias
  @IsInt() @Min(1) @Max(127) dow_mask: number;
  @IsNumber() @Min(0) preco_noite: number;
  @IsOptional() @IsInt() @Min(1) min_stay?: number;
}

export class UpdatePriceRuleDto {
  @IsOptional() @IsString() season_id?: string;
  @IsOptional() @IsInt() @Min(1) @Max(127) dow_mask?: number;
  @IsOptional() @IsNumber() @Min(0) preco_noite?: number;
  @IsOptional() @IsInt() @Min(1) min_stay?: number;
}

export class CreatePolicyDto {
  @IsString() @Length(1, 120) nome: string;
  @IsInt() @Min(0) dias_antecedencia_remarcacao: number;
  @IsBoolean() reembolso_apos_prazo: boolean;
  @IsNumber() @Min(0) @Max(100) taxa_noshow_percent: number;
}

export class UpdatePolicyDto {
  @IsOptional() @IsString() @Length(1, 120) nome?: string;
  @IsOptional() @IsInt() @Min(0) dias_antecedencia_remarcacao?: number;
  @IsOptional() @IsBoolean() reembolso_apos_prazo?: boolean;
  @IsOptional() @IsNumber() @Min(0) @Max(100) taxa_noshow_percent?: number;
}

export class CreateRatePlanDto {
  @IsString() room_type_id: string;
  @IsString() @Length(1, 120) nome: string;
  @IsOptional() @IsString() cancellation_policy_id?: string;
  @IsOptional() @IsString() derivado_de?: string;
  @IsOptional() @IsNumber() @Min(-100) @Max(100) percentual_ajuste?: number;
}

export class UpdateRatePlanDto {
  @IsOptional() @IsString() @Length(1, 120) nome?: string;
  @IsOptional() @IsString() cancellation_policy_id?: string;
  @IsOptional() @IsNumber() @Min(-100) @Max(100) percentual_ajuste?: number;
  @IsOptional() @IsBoolean() ativo?: boolean;
}
