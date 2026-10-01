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
  @IsString() @MaxLength(100)
  event_id: string;

  @IsOptional() @IsString()
  tenant_id?: string;

  @IsISO8601()
  occurred_at: string;

  @IsString() @MaxLength(50)
  type: string;

  @IsOptional() @IsObject()
  actor?: Record<string, unknown> | null;

  @IsOptional() @IsObject()
  contact?: Record<string, unknown> | null;

  @IsOptional() @IsString()
  stage?: string | null;

  @IsOptional() @IsObject()
  hold?: Record<string, unknown> | null;

  @IsOptional() @IsObject()
  data?: Record<string, unknown> | null;
}

export class BotEventBatchDto {
  @IsString()
  tenant_id: string;

  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(BOT_EVENT_BATCH_MAX)
  @ValidateNested({ each: true })
  @Type(() => BotEventV2Dto)
  events: BotEventV2Dto[];
}
