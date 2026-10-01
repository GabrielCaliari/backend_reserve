import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { errorResponse, successResponse } from '../../../../shared/helpers';

interface PmsBookingPayload {
  externalId?: unknown; engine?: unknown; status?: unknown; channel?: unknown;
  amount?: unknown; checkIn?: unknown; checkOut?: unknown; bookedAt?: unknown;
}

const STATUS_MAP: Record<string, 'CONFIRMED' | 'CANCELLED'> = {
  confirmed: 'CONFIRMED',
  modified: 'CONFIRMED',
  cancelled: 'CANCELLED',
};

const OTA_SOURCE: Record<string, string> = {
  booking: 'BOOKING_COM',
  expedia: 'EXPEDIA',
  airbnb: 'AIRBNB',
  tripadvisor: 'TRIPADVISOR',
};

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Canal C do contrato v2 (§4.7): reservas detectadas pelo bot no PMS (site,
 * OTA, balcao e as do proprio bot). Autenticado por HMAC-SHA256 do corpo bruto
 * com o segredo do cliente. Contato chega com hash (LGPD): nao cria hospede.
 */
@Injectable()
export class PmsBookingWebhookService {
  private readonly logger = new Logger(PmsBookingWebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  async receive(
    clientId: string,
    rawBody: Buffer | undefined,
    signature: string | undefined,
    payload: PmsBookingPayload,
  ) {
    const client = await this.prisma.hotelClient.findUnique({
      where: { id: clientId },
      select: { tenant_id: true, webhook_secret: true },
    });
    // Cliente inexistente, sem tenant ou sem segredo falham igual: nunca
    // revelar a um chamador nao autenticado se o cliente existe.
    if (!client?.tenant_id || !client.webhook_secret || !rawBody || !this.assinaturaValida(rawBody, signature, client.webhook_secret)) {
      return errorResponse('401:INVALID_SIGNATURE', 401);
    }

    const externalId = typeof payload.externalId === 'string' ? payload.externalId.slice(0, 100) : '';
    const checkIn = typeof payload.checkIn === 'string' && DATA_ISO.test(payload.checkIn) ? payload.checkIn : '';
    const checkOut = typeof payload.checkOut === 'string' && DATA_ISO.test(payload.checkOut) ? payload.checkOut : '';
    const status = STATUS_MAP[String(payload.status ?? '').toLowerCase()];
    if (!externalId || !checkIn || !checkOut || !status) {
      return errorResponse('400:INVALID_BOOKING_PAYLOAD', 400);
    }

    const amount = Number(payload.amount);
    const dados = {
      engine_type: 'HOSPEDIN' as const,
      source: this.sourceFor(String(payload.channel ?? 'direct')) as any,
      status: status as any,
      check_in: new Date(checkIn),
      check_out: new Date(checkOut),
      // Contrato: amount em centavos; a coluna total_amount e em reais.
      total_amount: Number.isFinite(amount) ? Math.round(amount) / 100 : 0,
      raw_payload: payload as object,
      processed: true,
    };

    const existente = await this.prisma.hotelReservation.findFirst({
      where: { tenant_id: client.tenant_id, external_id: externalId },
      select: { id: true },
    });
    const reserva = existente
      ? await this.prisma.hotelReservation.update({ where: { id: existente.id }, data: dados })
      : await this.prisma.hotelReservation.create({
          data: {
            ...dados,
            tenant_id: client.tenant_id,
            external_id: externalId,
            // guest_name e obrigatorio na tabela; o nome real nao trafega aqui.
            guest_name: 'Hóspede (PMS)',
            booking_date: typeof payload.bookedAt === 'string' ? new Date(payload.bookedAt) : new Date(),
          },
        });

    return successResponse({ received: true, reservationId: reserva.id, conversionDispatched: false }, 200);
  }

  private assinaturaValida(rawBody: Buffer, signature: string | undefined, secret: string): boolean {
    if (!signature) return false;
    const esperado = crypto.createHmac('sha256', secret).update(rawBody).digest();
    const recebido = Buffer.from(signature, 'hex');
    return recebido.length === esperado.length && crypto.timingSafeEqual(recebido, esperado);
  }

  private sourceFor(channel: string): string {
    const canal = channel.toLowerCase();
    if (canal === 'direct') return 'DIRECT';
    const [, ota] = canal.split(':');
    return OTA_SOURCE[ota ?? ''] ?? 'OTHER_OTA';
  }
}
