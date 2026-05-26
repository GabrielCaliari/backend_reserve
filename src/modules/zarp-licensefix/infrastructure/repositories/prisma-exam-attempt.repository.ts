import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { IExamAttemptRepository } from '../../domain/interfaces/exam-attempt.repository.interface';
import { EAttemptStatus } from '../../domain/enums/attempt-status.enum';

@Injectable()
export class PrismaExamAttemptRepository implements IExamAttemptRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(customerId: string, practiceExamId: string) {
    return this.prisma.examAttempt.create({
      data: { customer_id: customerId, practice_exam_id: practiceExamId },
      include: {
        PracticeExam: {
          include: {
            Questions: {
              where: { deleted_at: null },
              orderBy: { order: 'asc' },
              include: { Options: { orderBy: { label: 'asc' } } },
            },
          },
        },
      },
    });
  }

  findById(id: string) {
    return this.prisma.examAttempt.findUnique({
      where: { id },
      include: {
        PracticeExam: { include: { Questions: { where: { deleted_at: null }, orderBy: { order: 'asc' }, include: { Options: { orderBy: { label: 'asc' } } } } } },
        Responses: true,
      },
    });
  }

  findByCustomer(customerId: string) {
    return this.prisma.examAttempt.findMany({
      where: { customer_id: customerId },
      orderBy: { started_at: 'desc' },
      include: { PracticeExam: { select: { id: true, title: true, section: true } } },
    });
  }

  findByExam(practiceExamId: string) {
    return this.prisma.examAttempt.findMany({
      where: { practice_exam_id: practiceExamId },
      orderBy: { started_at: 'desc' },
      include: {
        Customer: { select: { id: true, name: true, email: true } },
        Responses: {
          include: {
            Question: { select: { id: true, statement: true, correct_option: true, order: true } },
          },
        },
      },
    });
  }

  findAllWithDetails() {
    return this.prisma.examAttempt.findMany({
      orderBy: { started_at: 'desc' },
      include: {
        Customer: { select: { id: true, name: true, email: true } },
        PracticeExam: { select: { id: true, title: true, section: true } },
        Responses: {
          include: {
            Question: { select: { id: true, statement: true, correct_option: true, order: true } },
          },
        },
      },
    });
  }

  findByIdForAdmin(id: string) {
    return this.prisma.examAttempt.findUnique({
      where: { id },
      include: {
        Customer: { select: { id: true, name: true, email: true } },
        PracticeExam: { select: { id: true, title: true } },
        Responses: {
          include: {
            Question: {
              include: { Options: { orderBy: { label: 'asc' } } },
            },
          },
        },
      },
    });
  }

  findByCustomerForAdmin(customerId: string) {
    return this.prisma.examAttempt.findMany({
      where: { customer_id: customerId },
      orderBy: { started_at: 'desc' },
      include: {
        PracticeExam: { select: { id: true, title: true } },
      },
    });
  }

  upsertResponse(attemptId: string, questionId: string, selectedOption: string | null, isCorrect: boolean | null, flagged?: boolean) {
    return this.prisma.questionResponse.upsert({
      where: { attempt_id_question_id: { attempt_id: attemptId, question_id: questionId } },
      update: {
        selected_option: selectedOption,
        is_correct: isCorrect,
        answered_at: selectedOption ? new Date() : undefined,
        ...(flagged !== undefined && { flagged }),
      },
      create: {
        attempt_id: attemptId,
        question_id: questionId,
        selected_option: selectedOption,
        is_correct: isCorrect,
        flagged: flagged ?? false,
        answered_at: selectedOption ? new Date() : undefined,
      },
    });
  }

  async setFlagged(attemptId: string, questionId: string, flagged: boolean) {
    await this.prisma.questionResponse.upsert({
      where: { attempt_id_question_id: { attempt_id: attemptId, question_id: questionId } },
      update: { flagged },
      create: { attempt_id: attemptId, question_id: questionId, flagged },
    });
  }

  finish(id: string, status: EAttemptStatus, score: number) {
    return this.prisma.examAttempt.update({
      where: { id },
      data: { status, score, finished_at: new Date() },
      include: {
        Responses: {
          include: {
            Question: { include: { Options: { orderBy: { label: 'asc' } } } },
          },
        },
        PracticeExam: {
          include: {
            Questions: {
              where: { deleted_at: null },
              orderBy: { order: 'asc' },
              include: { Options: { orderBy: { label: 'asc' } } },
            },
          },
        },
      },
    });
  }
}
