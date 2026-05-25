import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  ICreateBundleData,
  IUpdateBundleData,
  IPracticeExamBundleRepository,
} from '../../domain/interfaces/practice-exam-bundle.repository.interface';

@Injectable()
export class PrismaPracticeExamBundleRepository implements IPracticeExamBundleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByTenant(tenantId: string) {
    return this.prisma.practiceExamBundle.findMany({
      where: { tenant_id: tenantId },
      include: {
        Exams: { select: { exam_id: true } },
        _count: { select: { Exams: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(tenantId: string, data: ICreateBundleData) {
    return this.prisma.practiceExamBundle.create({
      data: {
        tenant_id: tenantId,
        title: data.title,
        description: data.description,
        is_active: data.is_active ?? true,
        stripe_product_id: data.stripe_product_id,
        Exams: {
          create: data.exam_ids.map((exam_id) => ({ exam_id })),
        },
      },
      include: {
        Exams: { select: { exam_id: true } },
        _count: { select: { Exams: true } },
      },
    });
  }

  async update(bundleId: string, data: IUpdateBundleData) {
    return this.prisma.practiceExamBundle.update({
      where: { id: bundleId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.is_active !== undefined && { is_active: data.is_active }),
        ...(data.stripe_product_id !== undefined && { stripe_product_id: data.stripe_product_id }),
        ...(data.exam_ids !== undefined && {
          Exams: {
            deleteMany: {},
            create: data.exam_ids.map((exam_id) => ({ exam_id })),
          },
        }),
      },
      include: {
        Exams: { select: { exam_id: true } },
        _count: { select: { Exams: true } },
      },
    });
  }

  async delete(bundleId: string): Promise<void> {
    await this.prisma.practiceExamBundle.delete({ where: { id: bundleId } });
  }
}
