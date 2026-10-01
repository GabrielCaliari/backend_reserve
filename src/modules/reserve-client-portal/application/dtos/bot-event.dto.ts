import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsISO8601, IsObject, IsOptional, IsString,
  MaxLength, ValidateNested,
} from 'class-validator';

/** Contrato v2 §3.1: no maximo 50 eventos de funil + 200 mensagens + 1 heartbeat. */
export const BOT_EVENT_BATCH_MAX = 250;

/**
 * Evento do contrato v2 (§3.4). `actor`, `contact`, `hold` e `data` sao objetos
 * soltos de proposito: vem de um sistema externo e o projetor os le de forma
 * defensiva. Tipa-los como classe faria o whitelist do ValidationPipe descartar
 * em silencio qualquer campo novo que o bot passe a mandar.
 */
export class BotEventV2Dto {
  @ApiProperty({ description: 'Id unico do evento (idempotencia).', maxLength: 100, example: 'evt_01HX' })
  @IsString() @MaxLength(100)
  event_id: string;

  @ApiPropertyOptional({ description: 'Tenant do evento (deve coincidir com o do lote).' })
  @IsOptional() @IsString()
  tenant_id?: string;

  @ApiProperty({ description: 'Quando ocorreu (ISO 8601).', example: '2026-09-30T14:00:00.000Z' })
  @IsISO8601()
  occurred_at: string;

  @ApiProperty({ description: 'Tipo do evento do contrato v2 (contato.criado, mensagem.recebida, funil.estagio_alterado, hold.criado, ...).', maxLength: 50, example: 'funil.estagio_alterado' })
  @IsString() @MaxLength(50)
  type: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true, description: 'Quem gerou o evento (bot, humano).' })
  @IsOptional() @IsObject()
  actor?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true, description: 'Dados do contato (numero, nome, ...).' })
  @IsOptional() @IsObject()
  contact?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: 'string', nullable: true, description: 'Estagio do funil associado.', example: 'QUALIFICADO' })
  @IsOptional() @IsString()
  stage?: string | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true, description: 'Dados do hold (codigo, status, valor).' })
  @IsOptional() @IsObject()
  hold?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true, description: 'Payload especifico do tipo.' })
  @IsOptional() @IsObject()
  data?: Record<string, unknown> | null;
}

export class BotEventBatchDto {
  @ApiProperty({ description: 'Tenant dono do lote.' })
  @IsString()
  tenant_id: string;

  @ApiProperty({ type: () => [BotEventV2Dto], description: 'Eventos do lote (1 a 250).', minItems: 1, maxItems: BOT_EVENT_BATCH_MAX })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(BOT_EVENT_BATCH_MAX)
  @ValidateNested({ each: true })
  @Type(() => BotEventV2Dto)
  events: BotEventV2Dto[];
}
