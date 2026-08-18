import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { nightsBetween, utcDate } from '../../domain/constants/motor.constants';
import {
  MotorNotFoundError,
  MotorTipoEsgotadoError,
  MotorValidationError,
} from '../../domain/errors/motor.errors';
import {
  CancelDto,
  CreateManualReservationDto,
  ListReservationsQueryDto,
  RescheduleDto,
} from '../dtos/reservation.dto';
import { AvailabilityService } from './availability.service';
import { ChannelPushService } from './channel-push.service';
import { isExclusionViolation } from './hold.service';

@Injectable()
export class ReservationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    // Opcional para nao quebrar instancias antigas; enqueue nunca lanca.
    private readonly channelPush?: ChannelPushService,
  ) {}

  async list(tenantId: string, query: ListReservationsQueryDto) {
    return this.prisma.motorReservation.findMany({
      where: {
        tenant_id: tenantId,
        ...(query.status ? { status: query.status as any } : {}),
        ...(query.origem ? { origem: query.origem as any } : {}),
        ...(query.from ? { checkout: { gt: utcDate(query.from) } } : {}),
        ...(query.to ? { checkin: { lte: utcDate(query.to) } } : {}),
      },
      include: { unit: true, room_type: true },
      orderBy: { checkin: 'desc' },
    });
  }

  async detail(tenantId: string, id: string) {
    const reservation = await this.prisma.motorReservation.findFirst({
      where: { id, tenant_id: tenantId },
      include: { unit: true, room_type: true, events: { orderBy: { created_at: 'asc' } } },
    });
    if (!reservation) throw new MotorNotFoundError('reserva nao encontrada');
    return reservation;
  }

  /**
   * Reserva manual (recepcao/gerente). Mesmo protocolo de lock do hold:
   * FOR UPDATE nas units + loop com a constraint de exclusao como rede.
   */
  async createManual(tenantId: string, dto: CreateManualReservationDto, autor: string) {
    const checkin = utcDate(dto.checkin);
    const checkout = utcDate(dto.checkout);
    if (nightsBetween(checkin, checkout) < 1) {
      throw new MotorValidationError('checkout deve ser posterior ao checkin');
    }
    let valorTotal = dto.valor_total;
    if (valorTotal == null) {
      const quote = await this.availability.quote(tenantId, {
        room_type_id: dto.room_type_id,
        checkin,
        checkout,
        adultos: dto.adultos,
        criancas: dto.criancas ?? 0,
        pets: dto.pets ?? 0,
        cliente_marina: false,
      });
      valorTotal = quote.valor_total;
    }
    const valorPago = dto.valor_pago ?? 0;

    const created = await this.prisma.$transaction(async (tx: any) => {
      await tx.$queryRaw`
        SELECT id FROM "motor_units"
        WHERE tenant_id = ${tenantId} AND room_type_id = ${dto.room_type_id} AND ativo = true
        FOR UPDATE
      `;
      const freeIds = await this.availability.freeUnitIds(
        tx,
        tenantId,
        dto.room_type_id,
        checkin,
        checkout,
      );
      const candidates = dto.unit_id ? freeIds.filter((id) => id === dto.unit_id) : freeIds;
      for (const unitId of candidates) {
        try {
          const created = await tx.motorReservation.create({
            data: {
              tenant_id: tenantId,
              room_type_id: dto.room_type_id,
              unit_id: unitId,
              checkin,
              checkout,
              status: 'CONFIRMADA',
              origem: (dto.origem as any) ?? 'MANUAL',
              hospede_nome: dto.hospede_nome,
              hospede_telefone: dto.hospede_telefone ?? null,
              hospede_email: dto.hospede_email ?? null,
              adultos: dto.adultos,
              criancas: dto.criancas ?? 0,
              pets: dto.pets ?? 0,
              valor_total: valorTotal,
              valor_pago: valorPago,
              saldo_checkin: Math.round((valorTotal! - valorPago) * 100) / 100,
              observacoes: dto.observacoes ?? null,
            },
          });
          await tx.motorReservationEvent.createMany({
            data: [
              {
                reservation_id: created.id,
                tipo: 'CRIADA',
                autor,
                payload: { origem: dto.origem ?? 'MANUAL' },
              },
            ],
          });
          return created;
        } catch (error) {
          if (isExclusionViolation(error)) continue;
          throw error;
        }
      }
      throw new MotorTipoEsgotadoError();
    });
    // Reserva manual decrementa o numAvail nas OTAs (gatilho de push, spec §3.3).
    void this.channelPush?.enqueue(tenantId, dto.room_type_id, checkin, checkout);
    return created;
  }

  /**
   * REMARCACAO e operacao propria (spec §1): libera as datas antigas, trava
   * as novas, MANTEM valor_pago. Nao e cancelar + criar.
   */
  async reschedule(tenantId: string, id: string, dto: RescheduleDto, autor: string) {
    const reservation = await this.mustFind(tenantId, id);
    if (!['CONFIRMADA', 'HOLD'].includes(reservation.status)) {
      throw new MotorValidationError(`reserva ${reservation.status} nao pode ser remarcada`);
    }
    const novoCheckin = utcDate(dto.novo_checkin);
    const novoCheckout = utcDate(dto.novo_checkout);
    if (nightsBetween(novoCheckin, novoCheckout) < 1) {
      throw new MotorValidationError('novo_checkout deve ser posterior ao novo_checkin');
    }
    const quote = await this.availability.quote(tenantId, {
      room_type_id: reservation.room_type_id,
      checkin: novoCheckin,
      checkout: novoCheckout,
      adultos: reservation.adultos,
      criancas: reservation.criancas,
      pets: reservation.pets,
      cliente_marina: false,
    });

    const rescheduled = await this.prisma.$transaction(async (tx: any) => {
      await tx.$queryRaw`
        SELECT id FROM "motor_units"
        WHERE tenant_id = ${tenantId} AND room_type_id = ${reservation.room_type_id} AND ativo = true
        FOR UPDATE
      `;
      // Exclui a propria reserva do calculo: ela pode continuar na mesma unit.
      const freeIds = await this.availability.freeUnitIds(
        tx,
        tenantId,
        reservation.room_type_id,
        novoCheckin,
        novoCheckout,
        reservation.id,
      );
      for (const unitId of freeIds) {
        try {
          const updated = await tx.motorReservation.update({
            where: { id: reservation.id },
            data: {
              unit_id: unitId,
              checkin: novoCheckin,
              checkout: novoCheckout,
              valor_total: quote.valor_total,
              saldo_checkin:
                Math.round((quote.valor_total - Number(reservation.valor_pago)) * 100) / 100,
            },
          });
          await tx.motorReservationEvent.create({
            data: {
              reservation_id: reservation.id,
              tipo: 'REMARCADA',
              autor,
              payload: {
                de: {
                  checkin: reservation.checkin,
                  checkout: reservation.checkout,
                  unit_id: reservation.unit_id,
                },
                para: {
                  checkin: dto.novo_checkin,
                  checkout: dto.novo_checkout,
                  unit_id: unitId,
                },
              },
            },
          });
          return updated;
        } catch (error) {
          if (isExclusionViolation(error)) continue;
          throw error;
        }
      }
      throw new MotorTipoEsgotadoError('sem unidade livre nas novas datas');
    });
    // Remarcacao muda dois ranges: o antigo libera, o novo ocupa (spec §3.3).
    void this.channelPush?.enqueue(
      tenantId,
      reservation.room_type_id,
      reservation.checkin,
      reservation.checkout,
    );
    void this.channelPush?.enqueue(tenantId, reservation.room_type_id, novoCheckin, novoCheckout);
    return rescheduled;
  }

  /**
   * Cancelar != estornar (spec §6): libera datas e registra o evento;
   * estorno no Asaas e acao manual da equipe pelo painel.
   */
  async cancel(tenantId: string, id: string, dto: CancelDto, autor: string) {
    const reservation = await this.mustFind(tenantId, id);
    if (['CANCELADA', 'CONCLUIDA'].includes(reservation.status)) {
      throw new MotorValidationError(`reserva ja esta ${reservation.status}`);
    }
    const policy = await this.prisma.motorCancellationPolicy.findFirst({
      where: { tenant_id: tenantId },
    });
    const diasAntecedencia = policy?.dias_antecedencia_remarcacao ?? 7;
    const diasAteCheckin = Math.floor(
      (reservation.checkin.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
    );
    const creditoRemarcacao = diasAteCheckin >= diasAntecedencia;

    const updated = await this.prisma.motorReservation.update({
      where: { id: reservation.id },
      data: { status: 'CANCELADA' },
    });
    await this.prisma.motorReservationEvent.create({
      data: {
        reservation_id: reservation.id,
        tipo: 'CANCELADA',
        autor,
        payload: {
          motivo: dto.motivo,
          dias_ate_checkin: diasAteCheckin,
          credito_remarcacao: creditoRemarcacao,
          valor_pago: Number(reservation.valor_pago),
        },
      },
    });
    // Cancelamento libera as datas nas OTAs (gatilho de push, spec §3.3).
    void this.channelPush?.enqueue(
      tenantId,
      reservation.room_type_id,
      reservation.checkin,
      reservation.checkout,
    );
    return { ...updated, credito_remarcacao: creditoRemarcacao };
  }

  private async mustFind(tenantId: string, id: string) {
    const reservation = await this.prisma.motorReservation.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!reservation) throw new MotorNotFoundError('reserva nao encontrada');
    return reservation;
  }
}
