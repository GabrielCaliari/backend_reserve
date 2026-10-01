import * as crypto from 'crypto';
import { PmsBookingWebhookService } from './pms-booking-webhook.service';

const SECRET = 'segredo-do-cliente';
const payload = {
  externalId: 'r_30644146', engine: 'hospedin', status: 'confirmed', channel: 'direct',
  amount: 104900, checkIn: '2026-11-20', checkOut: '2026-11-22', bookedAt: '2026-10-01T01:37:11.000Z',
  guest: { emailHash: 'abc', phoneHash: 'def' },
};
const raw = Buffer.from(JSON.stringify(payload));
const assinatura = crypto.createHmac('sha256', SECRET).update(raw).digest('hex');

describe('PmsBookingWebhookService (contrato v2 §4.7)', () => {
  let prisma: any;
  let service: PmsBookingWebhookService;

  beforeEach(() => {
    prisma = {
      hotelClient: { findUnique: jest.fn().mockResolvedValue({ tenant_id: 'tenant_1', webhook_secret: SECRET }) },
      hotelReservation: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'res_1' }),
        update: jest.fn().mockResolvedValue({ id: 'res_1' }),
      },
    };
    service = new PmsBookingWebhookService(prisma);
  });

  it('assinatura valida: cria a reserva convertendo centavos em reais', async () => {
    const result = await service.receive('client_1', raw, assinatura, payload);
    expect(result.status).toBe(200);
    expect(result.data).toEqual({ received: true, reservationId: 'res_1', conversionDispatched: false });
    expect(prisma.hotelReservation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenant_id: 'tenant_1', external_id: 'r_30644146', engine_type: 'HOSPEDIN',
        source: 'DIRECT', status: 'CONFIRMED', total_amount: 1049,
        check_in: new Date('2026-11-20'), check_out: new Date('2026-11-22'),
      }),
    });
  });

  it('assinatura errada: 401 e nada gravado', async () => {
    const result = await service.receive('client_1', raw, 'deadbeef', payload);
    expect(result.status).toBe(401);
    expect(prisma.hotelReservation.create).not.toHaveBeenCalled();
  });

  it('cliente sem segredo configurado: 401', async () => {
    prisma.hotelClient.findUnique.mockResolvedValue({ tenant_id: 'tenant_1', webhook_secret: null });
    const result = await service.receive('client_1', raw, assinatura, payload);
    expect(result.status).toBe(401);
  });

  it('reserva ja conhecida e atualizada, nao duplicada', async () => {
    prisma.hotelReservation.findFirst.mockResolvedValue({ id: 'res_1' });
    const cancelada = { ...payload, status: 'cancelled' };
    const rawCancelada = Buffer.from(JSON.stringify(cancelada));
    const sig = crypto.createHmac('sha256', SECRET).update(rawCancelada).digest('hex');
    await service.receive('client_1', rawCancelada, sig, cancelada);
    expect(prisma.hotelReservation.create).not.toHaveBeenCalled();
    expect(prisma.hotelReservation.update).toHaveBeenCalledWith({
      where: { id: 'res_1' },
      data: expect.objectContaining({ status: 'CANCELLED' }),
    });
  });

  it('canal ota vira OTHER_OTA; ota:booking vira BOOKING_COM', async () => {
    for (const [channel, source] of [['ota', 'OTHER_OTA'], ['ota:booking', 'BOOKING_COM']]) {
      const p = { ...payload, channel };
      const r = Buffer.from(JSON.stringify(p));
      const sig = crypto.createHmac('sha256', SECRET).update(r).digest('hex');
      prisma.hotelReservation.create.mockClear();
      await service.receive('client_1', r, sig, p);
      expect(prisma.hotelReservation.create.mock.calls[0][0].data.source).toBe(source);
    }
  });

  it('corpo sem externalId ou datas: 400', async () => {
    const p = { ...payload, externalId: undefined };
    const r = Buffer.from(JSON.stringify(p));
    const sig = crypto.createHmac('sha256', SECRET).update(r).digest('hex');
    const result = await service.receive('client_1', r, sig, p as any);
    expect(result.status).toBe(400);
  });
});
