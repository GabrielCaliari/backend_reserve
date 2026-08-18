import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { MotorNotFoundError, MotorValidationError } from '../../domain/errors/motor.errors';
import { CreateRoomTypeDto, UpdateRoomTypeDto } from '../dtos/room-type.dto';

@Injectable()
export class RoomTypeService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    return this.prisma.motorRoomType.findMany({
      where: { tenant_id: tenantId },
      include: { units: { orderBy: { identificador: 'asc' } } },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
    });
  }

  async create(tenantId: string, dto: CreateRoomTypeDto) {
    this.assertCapacity(dto.capacidade_base, dto.capacidade_max);
    return this.prisma.motorRoomType.create({
      data: {
        tenant_id: tenantId,
        nome: dto.nome,
        descricao_curta: dto.descricao_curta,
        capacidade_base: dto.capacidade_base,
        capacidade_max: dto.capacidade_max,
        valor_pessoa_adicional: dto.valor_pessoa_adicional ?? 0,
        aceita_pets: dto.aceita_pets ?? false,
        taxa_pet_dia: dto.taxa_pet_dia ?? 0,
        ordem: dto.ordem ?? 0,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateRoomTypeDto) {
    const exists = await this.prisma.motorRoomType.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!exists) throw new MotorNotFoundError('room_type nao encontrado');
    const base = dto.capacidade_base ?? exists.capacidade_base;
    const max = dto.capacidade_max ?? exists.capacidade_max;
    this.assertCapacity(base, max);
    return this.prisma.motorRoomType.update({ where: { id }, data: { ...dto } });
  }

  // capacidade_max = base + no maximo 1 adicional: o limite vive AQUI, nao no
  // prompt do bot (spec §2, alocacao inteligente).
  private assertCapacity(base: number, max: number): void {
    if (max < base || max > base + 1) {
      throw new MotorValidationError('capacidade_max deve ser base ou base+1 (max 1 adicional)');
    }
  }
}
