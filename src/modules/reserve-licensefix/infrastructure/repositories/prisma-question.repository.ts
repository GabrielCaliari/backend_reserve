import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  IQuestionRepository,
  ICreateQuestionData,
  IUpdateQuestionData,
} from '../../domain/interfaces/question.repository.interface';

@Injectable()
export class PrismaQuestionRepository implements IQuestionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: ICreateQuestionData) {
    const { options, ...rest } = data;
    return this.prisma.question.create({
      data: {
        ...rest,
        Options: { create: options },
      },
      include: { Options: { orderBy: { label: 'asc' } } },
    });
  }

  findById(id: string) {
    return this.prisma.question.findFirst({
      where: { id, deleted_at: null },
      include: { Options: { orderBy: { label: 'asc' } } },
    });
  }

  findByExam(practiceExamId: string) {
    return this.prisma.question.findMany({
      where: { practice_exam_id: practiceExamId, deleted_at: null },
      orderBy: { order: 'asc' },
      include: { Options: { orderBy: { label: 'asc' } } },
    });
  }

  async update(id: string, data: IUpdateQuestionData) {
    const { options, ...rest } = data;
    if (options) {
      await this.prisma.optionQuestion.deleteMany({ where: { question_id: id } });
      await this.prisma.optionQuestion.createMany({ data: options.map(o => ({ ...o, question_id: id })) });
    }
    return this.prisma.question.update({
      where: { id },
      data: rest,
      include: { Options: { orderBy: { label: 'asc' } } },
    });
  }

  async softDelete(id: string) {
    await this.prisma.question.update({ where: { id }, data: { deleted_at: new Date() } });
  }

  async hardDelete(id: string) {
    await this.prisma.optionQuestion.deleteMany({ where: { question_id: id } });
    await this.prisma.question.delete({ where: { id } });
  }

  async hasResponses(id: string): Promise<boolean> {
    const count = await this.prisma.questionResponse.count({ where: { question_id: id } });
    return count > 0;
  }
}
