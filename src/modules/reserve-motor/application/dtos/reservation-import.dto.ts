import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { MANUAL_ORIGENS } from './reservation.dto';

/**
 * Importador do cutover (plano Fase 3, Task DEV-1): cada linha vem do export
 * de reservas futuras do HBOOK. external_ref e a chave de idempotencia
 * (gravada em external_id) — reimportar o mesmo export nao duplica.
 */
export class ImportReservationLineDto {
  @IsDateString() checkin: string;
  @IsDateString() checkout: string;
  @IsString() @Length(1, 200) hospede_nome: string;
  @IsOptional() @IsString() hospede_telefone?: string;
  @IsString() @Length(1, 200) room_type_nome: string;
  @IsOptional() @IsString() @Length(1, 60) unit_identificador?: string;
  @IsOptional() @IsNumber() @Min(0) valor_total?: number;
  @IsIn(MANUAL_ORIGENS) origem: string;
  @IsOptional() @IsString() @Length(1, 120) external_ref?: string;
}

export class ImportReservationsDto {
  /** Ausente/false = dry-run (valida e reporta linha a linha SEM gravar). */
  @IsOptional() @IsBoolean() commit?: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ImportReservationLineDto)
  linhas: ImportReservationLineDto[];
}
