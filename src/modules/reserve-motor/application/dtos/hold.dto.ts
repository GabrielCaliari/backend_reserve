import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export const HOLD_FORMAS = ['PIX_LINK', 'CARTAO', 'PIX_MANUAL'] as const;
export type HoldForma = (typeof HOLD_FORMAS)[number];

export class CreateHoldDto {
  @IsString() room_type_id: string;
  @IsDateString() checkin: string;
  @IsDateString() checkout: string;
  @IsInt() @Min(1) adultos: number;
  @IsOptional() @IsInt() @Min(0) criancas?: number;
  @IsOptional() @IsInt() @Min(0) pets?: number;
  @IsString() @Length(8, 40) contato_whatsapp: string;
  @IsIn(HOLD_FORMAS) forma_pagamento: HoldForma;
  @IsOptional() @IsBoolean() cliente_marina?: boolean;
  @IsOptional() @IsString() asaas_payment_id?: string;
}

export class ConfirmHoldDto {
  @IsOptional() @IsString() asaas_payment_id?: string;
  @IsOptional() @IsString() @Length(1, 200) hospede_nome?: string;
  @IsOptional() @IsString() hospede_email?: string;
  @IsOptional() @IsString() hospede_doc?: string;
  @IsOptional() valor_pago?: number;
  @IsOptional() atribuicao?: Record<string, unknown>;
}
