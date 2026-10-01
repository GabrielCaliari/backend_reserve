import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class PauseConversationDto {
  @IsOptional() @IsString() @MaxLength(255)
  motivo?: string;
}

export class ExtendHoldDto {
  /** Padrao do contrato: 60 minutos. Teto de 24h para barrar erro de digitacao. */
  @IsOptional() @IsInt() @Min(5) @Max(1440)
  minutos?: number;

  @IsOptional() @IsString() @MaxLength(20)
  codigo?: string;
}
