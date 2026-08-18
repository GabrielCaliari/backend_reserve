import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export const MANUAL_ORIGENS = ['MANUAL', 'SITE_HSYSTEM'] as const;

export class CreateManualReservationDto {
  @IsString() room_type_id: string;
  @IsOptional() @IsString() unit_id?: string;
  @IsDateString() checkin: string;
  @IsDateString() checkout: string;
  @IsString() @Length(1, 200) hospede_nome: string;
  @IsOptional() @IsString() hospede_telefone?: string;
  @IsOptional() @IsString() hospede_email?: string;
  @IsInt() @Min(1) adultos: number;
  @IsOptional() @IsInt() @Min(0) criancas?: number;
  @IsOptional() @IsInt() @Min(0) pets?: number;
  @IsOptional() @IsNumber() @Min(0) valor_total?: number;
  @IsOptional() @IsNumber() @Min(0) valor_pago?: number;
  @IsOptional() @IsIn(MANUAL_ORIGENS) origem?: string;
  @IsOptional() @IsString() observacoes?: string;
}

export class RescheduleDto {
  @IsDateString() novo_checkin: string;
  @IsDateString() novo_checkout: string;
}

export class CancelDto {
  @IsString() @Length(1, 500) motivo: string;
}

export class ListReservationsQueryDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() origem?: string;
}
