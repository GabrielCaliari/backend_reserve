import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { nightsBetween } from '../../domain/constants/motor.constants';

const STATUS_VENDA = ['CONFIRMADA', 'CHECKIN_FEITO', 'CONCLUIDA'] as const;

@Injectable()
export class MotorMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async metrics(tenantId: string, from: Date, to: Date) {
    const vendidas = await this.prisma.motorReservation.findMany({
      where: {
        tenant_id: tenantId,
        status: { in: STATUS_VENDA as any },
        created_at: { gte: from, lte: to },
      },
      select: { valor_total: true, checkin: true, checkout: true, origem: true, hospede_telefone: true, created_at: true },
    });
    const canceladasEventos = await this.prisma.motorReservationEvent.findMany({
      where: {
        tipo: 'CANCELADA',
        created_at: { gte: from, lte: to },
        reservation: { tenant_id: tenantId },
      },
      select: { reservation: { select: { valor_total: true } } },
    });
    const expirados = await this.prisma.motorHold.findMany({
      where: { tenant_id: tenantId, status: 'EXPIRADO', updated_at: { gte: from, lte: to } },
      select: { valor_total: true },
    });

    // Recuperacao (benchmark P0-1): venda do bot cujo telefone tinha um hold
    // EXPIRADO criado ANTES da reserva = cotacao que caiu e depois fechou.
    const telefonesVendidos = vendidas
      .filter((r) => r.origem === 'BOT_WHATSAPP' && r.hospede_telefone)
      .map((r) => r.hospede_telefone as string);
    const expiradosAntigos = telefonesVendidos.length
      ? await this.prisma.motorHold.findMany({
          where: { tenant_id: tenantId, status: 'EXPIRADO', contato_whatsapp: { in: telefonesVendidos } },
          select: { contato_whatsapp: true, created_at: true },
        })
      : [];
    const primeiroExpiradoPorContato = new Map<string, Date>();
    for (const h of expiradosAntigos) {
      const atual = primeiroExpiradoPorContato.get(h.contato_whatsapp);
      if (!atual || h.created_at < atual) primeiroExpiradoPorContato.set(h.contato_whatsapp, h.created_at);
    }
    const recuperadas = vendidas.filter((r) => {
      if (r.origem !== 'BOT_WHATSAPP' || !r.hospede_telefone) return false;
      const exp = primeiroExpiradoPorContato.get(r.hospede_telefone);
      return !!exp && exp < r.created_at;
    });

    const soma = (valores: unknown[]) => valores.reduce<number>((acc, v) => acc + Number(v), 0);
    const receita = soma(vendidas.map((r) => r.valor_total));
    const roomNights = vendidas.reduce((acc, r) => acc + nightsBetween(r.checkin, r.checkout), 0);

    const porOrigem = new Map<string, { reservas: number; receita: number }>();
    for (const r of vendidas) {
      const atual = porOrigem.get(r.origem) ?? { reservas: 0, receita: 0 };
      atual.reservas += 1;
      atual.receita += Number(r.valor_total);
      porOrigem.set(r.origem, atual);
    }

    return {
      receita,
      reservas: vendidas.length,
      ticket_medio: vendidas.length ? receita / vendidas.length : 0,
      room_nights: roomNights,
      canceladas: {
        quantidade: canceladasEventos.length,
        valor: soma(canceladasEventos.map((e) => e.reservation.valor_total)),
      },
      a_recuperar: { quantidade: expirados.length, valor: soma(expirados.map((h) => h.valor_total)) },
      recuperadas: { quantidade: recuperadas.length, valor: soma(recuperadas.map((r) => r.valor_total)) },
      receita_bot: porOrigem.get('BOT_WHATSAPP')?.receita ?? 0,
      por_origem: [...porOrigem.entries()].map(([origem, v]) => ({ origem, ...v })),
    };
  }
}
