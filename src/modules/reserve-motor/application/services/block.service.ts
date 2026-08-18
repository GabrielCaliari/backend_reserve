import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { utcDate } from '../../domain/constants/motor.constants';
import { MotorNotFoundError, MotorValidationError } from '../../domain/errors/motor.errors';
import { CreateBlockDto } from '../dtos/block.dto';

@Injectable()
export class BlockService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, filters: { unit_id?: string; from?: string; to?: string }) {
    return this.prisma.motorBlock.findMany({
      where: {
        tenant_id: tenantId,
        ...(filters.unit_id ? { unit_id: filters.unit_id } : {}),
        ...(filters.to ? { data_inicio: { lt: utcDate(filters.to) } } : {}),
        ...(filters.from
          ? { OR: [{ data_fim: null }, { data_fim: { gt: utcDate(filters.from) } }] }
          : {}),
      },
      orderBy: { data_inicio: 'asc' },
    });
  }

  /**
   * data_fim null = permanente (MENSALISTA, spec regra v5: a unit NUNCA e
   * oferecida, mesmo com o mensalista ausente). Block sobre reserva ativa e
   * rejeitado — a equipe resolve a reserva antes de bloquear.
   */
  async create(tenantId: string, dto: CreateBlockDto, autor: string) {
    const unit = await this.prisma.motorUnit.findFirst({
      where: { id: dto.unit_id, tenant_id: tenantId },
    });
    if (!unit) throw new MotorNotFoundError('unit nao encontrada');
    const inicio = utcDate(dto.data_inicio);
    const fim = dto.data_fim ? utcDate(dto.data_fim) : null;
    if (fim && fim <= inicio) {
      throw new MotorValidationError('data_fim deve ser posterior a data_inicio');
    }
    const conflitos = await this.prisma.motorReservation.count({
      where: {
        tenant_id: tenantId,
        unit_id: dto.unit_id,
        status: { in: ['HOLD', 'CONFIRMADA', 'CHECKIN_FEITO'] },
        checkin: fim ? { lt: fim } : undefined,
        checkout: { gt: inicio },
      },
    });
    if (conflitos > 0) {
      throw new MotorValidationError(
        'ha reserva ativa no periodo — resolva a reserva antes de bloquear',
      );
    }
    return this.prisma.motorBlock.create({
      data: {
        tenant_id: tenantId,
        unit_id: dto.unit_id,
        data_inicio: inicio,
        data_fim: fim,
        motivo: dto.motivo as any,
        nota: dto.nota ?? null,
        criado_por: autor,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const block = await this.prisma.motorBlock.findFirst({ where: { id, tenant_id: tenantId } });
    if (!block) throw new MotorNotFoundError('block nao encontrado');
    return this.prisma.motorBlock.delete({ where: { id } });
  }
}
