import 'reflect-metadata';
import { UnauthorizedException } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { ChannelInboundService } from './channel-inbound.service';
import { Beds24WebhookController } from '../../infrastructure/controllers/beds24-webhook.controller';
import { IS_PUBLIC_KEY } from '../../../../shared/auth/decorators/public.decorator';
import { REQUIRES_MODULE_KEY } from '../../../../shared/auth/decorators/requires-module.decorator';
import { utcDate } from '../../domain/constants/motor.constants';

const tenantId = 'tenant_1';

const basePayload = {
  booking: {
    id: 987,
    roomId: 101,
    arrival: '2026-09-05',
    departure: '2026-09-07',
    status: 'confirmed',
    channel: 'booking.com',
    modifiedTime: '2026-08-18T10:00:00Z',
    guestFirstName: 'Ana',
    guestName: 'Silva',
    guestEmail: 'ana@exemplo.com',
    guestPhone: '5535999990000',
    numAdult: 2,
    numChild: 0,
    price: 700,
  },
};

function buildDeps(overrides: Partial<Record<string, any>> = {}) {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    motorReservation: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'r_1', ...data })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'r_1', ...data })),
    },
    motorReservationEvent: { create: jest.fn().mockResolvedValue({}) },
    motorUnit: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'u_1', identificador: '01' },
        { id: 'u_2', identificador: '02' },
      ]),
    },
  };
  const prisma = {
    $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
    motorChannelSyncState: {
      findUnique: jest.fn().mockResolvedValue({
        tenant_id: tenantId,
        webhook_secret: 'segredo_1',
        beds24_property_id: 'prop_1',
        beds24_room_id_map: { rt_1: 101 },
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    motorReservation: {
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'r_ex', ...data })),
    },
    motorReservationEvent: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
    },
    ...overrides,
  };
  const availability = { freeUnitIds: jest.fn().mockResolvedValue(['u_1']) };
  const botEvents = { dispatch: jest.fn().mockResolvedValue(undefined) };
  const channelPush = { enqueue: jest.fn().mockResolvedValue(undefined) };
  const service = new ChannelInboundService(
    prisma as any,
    availability as any,
    botEvents as any,
    channelPush as any,
  );
  return { prisma, tx, availability, botEvents, channelPush, service };
}

describe('ChannelInboundService.process — seguranca', () => {
  it('segredo errado -> 401 sem processar nada', async () => {
    const { prisma, service } = buildDeps();
    await expect(service.process(tenantId, 'errado', basePayload as any)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('tenant sem webhook_secret -> 401 (canal nao conectado)', async () => {
    const { prisma, service } = buildDeps();
    prisma.motorChannelSyncState.findUnique.mockResolvedValue({ tenant_id: tenantId });
    await expect(service.process(tenantId, 'qualquer', basePayload as any)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

describe('ChannelInboundService.process — reserva nova da OTA', () => {
  it('cria CONFIRMADA com origem OTA_BOOKING, protocolo de lock e push aos demais canais', async () => {
    const { prisma, tx, channelPush, service } = buildDeps();
    const result = await service.process(tenantId, 'segredo_1', basePayload as any);

    expect(tx.$queryRaw).toHaveBeenCalled(); // FOR UPDATE nas units (Fase 1)
    expect(tx.motorReservation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          unit_id: 'u_1',
          status: 'CONFIRMADA',
          origem: 'OTA_BOOKING',
          external_id: '987',
          forma_pagamento: 'OTA',
          checkin: utcDate('2026-09-05'),
          checkout: utcDate('2026-09-07'),
        }),
      }),
    );
    expect(channelPush.enqueue).toHaveBeenCalledWith(
      tenantId,
      'rt_1',
      utcDate('2026-09-05'),
      utcDate('2026-09-07'),
    );
    // last_webhook_at sempre atualizado no fim.
    expect(prisma.motorChannelSyncState.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { last_webhook_at: expect.any(Date) } }),
    );
    expect(result).toMatchObject({ received: true, reservation_id: 'r_1', status: 'CONFIRMADA' });
  });

  it('canal airbnb vira origem OTA_AIRBNB', async () => {
    const { tx, service } = buildDeps();
    const payload = { booking: { ...basePayload.booking, channel: 'Airbnb' } };
    await service.process(tenantId, 'segredo_1', payload as any);
    expect(tx.motorReservation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ origem: 'OTA_AIRBNB' }) }),
    );
  });

  it('roomId fora do mapa: nao cria, marca DIVERGENTE e alerta', async () => {
    const { prisma, botEvents, service } = buildDeps();
    const payload = { booking: { ...basePayload.booking, roomId: 999 } };
    const result = await service.process(tenantId, 'segredo_1', payload as any);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.motorChannelSyncState.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'DIVERGENTE' } }),
    );
    expect(botEvents.dispatch).toHaveBeenCalledWith(
      tenantId,
      'canal.divergencia',
      expect.any(Object),
    );
    expect(result.ignored).toBe(true);
  });

  it('overbooking real (sem unit livre): grava HOLD + alerta PRIORITARIO + DIVERGENTE', async () => {
    const { prisma, tx, availability, botEvents, service } = buildDeps();
    availability.freeUnitIds.mockResolvedValue([]);
    const result = await service.process(tenantId, 'segredo_1', basePayload as any);

    expect(tx.motorReservation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'HOLD' }) }),
    );
    expect(prisma.motorChannelSyncState.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'DIVERGENTE' } }),
    );
    expect(botEvents.dispatch).toHaveBeenCalledWith(
      tenantId,
      'canal.overbooking',
      expect.objectContaining({ external_id: '987', prioridade: 'ALTA' }),
    );
    expect(result.status).toBe('HOLD');
  });
});

describe('ChannelInboundService.process — reserva existente (idempotencia e cancelamento)', () => {
  const existing = {
    id: 'r_ex',
    tenant_id: tenantId,
    room_type_id: 'rt_1',
    unit_id: 'u_1',
    checkin: utcDate('2026-09-05'),
    checkout: utcDate('2026-09-07'),
    status: 'CONFIRMADA',
    external_id: '987',
  };

  it('mesmo external_id + updated_at ja aplicado -> ignora sem reprocessar', async () => {
    const { prisma, service } = buildDeps();
    prisma.motorReservation.findFirst.mockResolvedValue(existing);
    prisma.motorReservationEvent.findFirst.mockResolvedValue({
      payload: { modified_time: basePayload.booking.modifiedTime },
    });
    const result = await service.process(tenantId, 'segredo_1', basePayload as any);
    expect(result.ignored).toBe(true);
    expect(prisma.motorReservation.update).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('cancelamento da OTA libera as datas e empurra aos demais canais', async () => {
    const { prisma, channelPush, service } = buildDeps();
    prisma.motorReservation.findFirst.mockResolvedValue(existing);
    const payload = {
      booking: { ...basePayload.booking, status: 'cancelled', modifiedTime: '2026-08-18T12:00:00Z' },
    };
    const result = await service.process(tenantId, 'segredo_1', payload as any);
    expect(prisma.motorReservation.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'r_ex' }, data: { status: 'CANCELADA' } }),
    );
    expect(channelPush.enqueue).toHaveBeenCalledWith(
      tenantId,
      'rt_1',
      existing.checkin,
      existing.checkout,
    );
    expect(result.status).toBe('CANCELADA');
  });

  it('datas mudaram na OTA: remarca com lock e empurra os dois ranges', async () => {
    const { prisma, tx, channelPush, service } = buildDeps();
    prisma.motorReservation.findFirst.mockResolvedValue(existing);
    const payload = {
      booking: {
        ...basePayload.booking,
        arrival: '2026-09-10',
        departure: '2026-09-12',
        modifiedTime: '2026-08-18T12:00:00Z',
      },
    };
    await service.process(tenantId, 'segredo_1', payload as any);
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.motorReservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          checkin: utcDate('2026-09-10'),
          checkout: utcDate('2026-09-12'),
        }),
      }),
    );
    expect(channelPush.enqueue).toHaveBeenCalledTimes(2); // range antigo + novo
  });
});

describe('ChannelInboundService — evento reserva.confirmada_ota ao bot (WF9)', () => {
  const existing = {
    id: 'r_ex',
    tenant_id: tenantId,
    room_type_id: 'rt_1',
    unit_id: 'u_1',
    checkin: utcDate('2026-09-05'),
    checkout: utcDate('2026-09-07'),
    status: 'CONFIRMADA',
    external_id: '987',
  };

  it('reserva nova confirmada despacha reserva.confirmada_ota com o payload do WF9', async () => {
    const { botEvents, service } = buildDeps();
    await service.process(tenantId, 'segredo_1', basePayload as any);
    expect(botEvents.dispatch).toHaveBeenCalledWith(tenantId, 'reserva.confirmada_ota', {
      reservation_id: 'r_1',
      external_id: '987',
      origem: 'OTA_BOOKING',
      checkin: '2026-09-05',
      checkout: '2026-09-07',
      hospede_nome: 'Ana Silva',
    });
  });

  it('cancelamento NAO despacha reserva.confirmada_ota', async () => {
    const { prisma, botEvents, service } = buildDeps();
    prisma.motorReservation.findFirst.mockResolvedValue(existing);
    const payload = {
      booking: { ...basePayload.booking, status: 'cancelled', modifiedTime: '2026-08-18T12:00:00Z' },
    };
    await service.process(tenantId, 'segredo_1', payload as any);
    expect(botEvents.dispatch).not.toHaveBeenCalledWith(
      tenantId,
      'reserva.confirmada_ota',
      expect.anything(),
    );
  });

  it('update ignorado pela idempotencia NAO despacha', async () => {
    const { prisma, botEvents, service } = buildDeps();
    prisma.motorReservation.findFirst.mockResolvedValue(existing);
    prisma.motorReservationEvent.findFirst.mockResolvedValue({
      payload: { modified_time: basePayload.booking.modifiedTime },
    });
    await service.process(tenantId, 'segredo_1', basePayload as any);
    expect(botEvents.dispatch).not.toHaveBeenCalled();
  });

  it('overbooking (HOLD) NAO despacha confirmada_ota — so o alerta canal.overbooking', async () => {
    const { availability, botEvents, service } = buildDeps();
    availability.freeUnitIds.mockResolvedValue([]);
    await service.process(tenantId, 'segredo_1', basePayload as any);
    expect(botEvents.dispatch).not.toHaveBeenCalledWith(
      tenantId,
      'reserva.confirmada_ota',
      expect.anything(),
    );
    expect(botEvents.dispatch).toHaveBeenCalledWith(
      tenantId,
      'canal.overbooking',
      expect.any(Object),
    );
  });

  it('update aplicado (datas remarcadas na OTA) despacha com as novas datas', async () => {
    const { prisma, botEvents, service } = buildDeps();
    prisma.motorReservation.findFirst.mockResolvedValue(existing);
    const payload = {
      booking: {
        ...basePayload.booking,
        arrival: '2026-09-10',
        departure: '2026-09-12',
        modifiedTime: '2026-08-18T12:00:00Z',
      },
    };
    await service.process(tenantId, 'segredo_1', payload as any);
    expect(botEvents.dispatch).toHaveBeenCalledWith(
      tenantId,
      'reserva.confirmada_ota',
      expect.objectContaining({
        reservation_id: 'r_ex',
        checkin: '2026-09-10',
        checkout: '2026-09-12',
      }),
    );
  });
});

describe('Beds24WebhookController — wiring', () => {
  it('e @Public e fica fora do gate de modulo (segredo por tenant e a autenticacao)', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, Beds24WebhookController)).toBe(true);
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, Beds24WebhookController)).toBeUndefined();
  });

  it('atende em webhooks/beds24 (coberto por LARGE_BODY_ROUTES no main.ts)', () => {
    expect(Reflect.getMetadata(PATH_METADATA, Beds24WebhookController)).toBe('webhooks/beds24');
  });
});
