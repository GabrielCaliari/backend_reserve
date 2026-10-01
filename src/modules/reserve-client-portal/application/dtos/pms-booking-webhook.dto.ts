import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Apenas documentacao OpenAPI do Canal C (§4.7). O controller continua
 * recebendo `Record<string, unknown>` de proposito: a assinatura HMAC precisa
 * ser conferida ANTES de qualquer validacao do corpo (401 antes de 400), e o
 * ValidationPipe global rodaria primeiro com uma classe tipada.
 */
export class PmsBookingWebhookDto {
  @ApiProperty({ description: 'Id da reserva no PMS (idempotencia por tenant).', maxLength: 100, example: 'PMS-98765' })
  externalId: string;

  @ApiPropertyOptional({ description: 'Motor/PMS de origem.', example: 'hospedin' })
  engine?: string;

  @ApiProperty({ description: 'Status da reserva no PMS.', enum: ['confirmed', 'modified', 'cancelled'], example: 'confirmed' })
  status: string;

  @ApiPropertyOptional({ description: 'Canal: direct ou ota:<booking|expedia|airbnb|tripadvisor>.', example: 'direct' })
  channel?: string;

  @ApiPropertyOptional({ description: 'Valor total em centavos.', example: 125000 })
  amount?: number;

  @ApiProperty({ description: 'Check-in (YYYY-MM-DD).', example: '2026-12-20' })
  checkIn: string;

  @ApiProperty({ description: 'Check-out (YYYY-MM-DD).', example: '2026-12-23' })
  checkOut: string;

  @ApiPropertyOptional({ description: 'Quando a reserva foi feita (ISO 8601).', example: '2026-09-30T14:00:00.000Z' })
  bookedAt?: string;
}
