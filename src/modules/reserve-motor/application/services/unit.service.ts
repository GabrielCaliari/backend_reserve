import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { MotorNotFoundError } from '../../domain/errors/motor.errors';
import { CreateUnitDto, UpdateUnitDto } from '../dtos/room-type.dto';

@Injectable()
export class UnitService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, roomTypeId?: string) {
    return this.prisma.motorUnit.findMany({
      where: { tenant_id: tenantId, ...(roomTypeId ? { room_type_id: roomTypeId } : {}) },
      orderBy: { identificador: 'asc' },
    });
  }

  async create(tenantId: string, dto: CreateUnitDto) {
    const roomType = await this.prisma.motorRoomType.findFirst({
      where: { id: dto.room_type_id, tenant_id: tenantId },
    });
    if (!roomType) throw new MotorNotFoundError('room_type nao encontrado');
    return this.prisma.motorUnit.create({
      data: {
        tenant_id: tenantId,
        room_type_id: dto.room_type_id,
        identificador: dto.identificador,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateUnitDto) {
    const exists = await this.prisma.motorUnit.findFirst({ where: { id, tenant_id: tenantId } });
    if (!exists) throw new MotorNotFoundError('unit nao encontrada');
    return this.prisma.motorUnit.update({ where: { id }, data: { ...dto } });
  }
}
