import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  IPracticeExamBundleRepository,
  PRACTICE_EXAM_BUNDLE_REPOSITORY,
} from '../../domain/interfaces/practice-exam-bundle.repository.interface';
import { CreateExamBundleDto, UpdateExamBundleDto } from '../dtos/practice-exam.dto';

@Injectable()
export class PracticeExamBundleUseCase {
  constructor(
    @Inject(PRACTICE_EXAM_BUNDLE_REPOSITORY)
    private readonly bundleRepo: IPracticeExamBundleRepository,
  ) {}

  async listBundles(tenantId: string) {
    const bundles = await this.bundleRepo.findByTenant(tenantId);
    return bundles.map(this.format);
  }

  async createBundle(tenantId: string, dto: CreateExamBundleDto) {
    const bundle = await this.bundleRepo.create(tenantId, dto);
    return this.format(bundle);
  }

  async updateBundle(bundleId: string, dto: UpdateExamBundleDto) {
    const bundle = await this.bundleRepo.update(bundleId, dto).catch(() => {
      throw new NotFoundException('Bundle not found.');
    });
    return this.format(bundle);
  }

  async deleteBundle(bundleId: string) {
    await this.bundleRepo.delete(bundleId).catch(() => {
      throw new NotFoundException('Bundle not found.');
    });
  }

  private format(bundle: any) {
    return {
      id: bundle.id,
      title: bundle.title,
      description: bundle.description,
      is_active: bundle.is_active,
      stripe_product_id: bundle.stripe_product_id ?? null,
      exam_ids: bundle.Exams.map((e: any) => e.exam_id),
      _count: { exams: bundle._count.Exams },
    };
  }
}
