import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class PauseConversationDto {
  @ApiPropertyOptional({ description: 'Motivo da pausa (assumir conversa).', maxLength: 255, example: 'Cliente pediu atendimento humano' })
  @IsOptional() @IsString() @MaxLength(255)
  motivo?: string;
}

export class ExtendHoldDto {
  /** Padrao do contrato: 60 minutos. Teto de 24h para barrar erro de digitacao. */
  @ApiPropertyOptional({ description: 'Minutos adicionais de hold (padrao 60).', minimum: 5, maximum: 1440, example: 60 })
  @IsOptional() @IsInt() @Min(5) @Max(1440)
  minutos?: number;

  @ApiPropertyOptional({ description: 'Codigo do hold a estender; omitido usa o hold atual do lead.', maxLength: 20, example: 'HLD-1234' })
  @IsOptional() @IsString() @MaxLength(20)
  codigo?: string;
}
