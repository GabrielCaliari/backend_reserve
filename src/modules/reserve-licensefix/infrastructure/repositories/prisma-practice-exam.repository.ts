import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  IPracticeExamRepository,
  ICreatePracticeExamData,
  IUpdatePracticeExamData,
} from '../../domain/interfaces/practice-exam.repository.interface';

@Injectable()
export class PrismaPracticeExamRepository implements IPracticeExamRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: ICreatePracticeExamData) {
    return this.prisma.practiceExam.create({ data, include: { Questions: { include: { Options: true } } } });
  }

  findById(id: string) {
    return this.prisma.practiceExam.findUnique({
      where: { id },
      include: {
        Questions: {
          where: { deleted_at: null },
          orderBy: { order: 'asc' },
          include: { Options: { orderBy: { label: 'asc' } } },
        },
      },
    });
  }

  findByIdForPreview(id: string) {
    return this.prisma.practiceExam.findUnique({
      where: { id },
      select: {
        id: true,
        tenant_id: true,
        title: true,
        section: true,
        time_limit: true,
        description: true,
        is_active: true,
        _count: { select: { Questions: { where: { deleted_at: null } } } },
      },
    });
  }

  findAllByTenant(tenantId: string) {
    return this.prisma.practiceExam.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
      include: { _count: { select: { Questions: { where: { deleted_at: null } } } } },
    });
  }

  findActiveByTenant(tenantId: string) {
    return this.prisma.practiceExam.findMany({
      where: { tenant_id: tenantId, is_active: true },
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        title: true,
        section: true,
        time_limit: true,
        description: true,
        _count: { select: { Questions: { where: { deleted_at: null } } } },
      },
    });
  }

  update(id: string, data: IUpdatePracticeExamData) {
    return this.prisma.practiceExam.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.prisma.practiceExam.delete({ where: { id } });
  }
}
