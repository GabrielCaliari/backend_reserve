import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  IPracticeExamRepository,
  PRACTICE_EXAM_REPOSITORY,
} from '../../domain/interfaces/practice-exam.repository.interface';
import {
  IExamAttemptRepository,
  EXAM_ATTEMPT_REPOSITORY,
} from '../../domain/interfaces/exam-attempt.repository.interface';
import { EAttemptStatus } from '../../domain/enums/attempt-status.enum';

@Injectable()
export class ExamAttemptUseCase {
  constructor(
    @Inject(PRACTICE_EXAM_REPOSITORY) private readonly examRepo: IPracticeExamRepository,
    @Inject(EXAM_ATTEMPT_REPOSITORY) private readonly attemptRepo: IExamAttemptRepository,
  ) {}

  listAvailableExams(tenantId: string) {
    return this.examRepo.findActiveByTenant(tenantId);
  }

  async getExamDetail(examId: string, tenantId: string) {
    const exam = await this.examRepo.findByIdForPreview(examId);
    if (!exam || exam.tenant_id !== tenantId || !exam.is_active) {
      throw new NotFoundException('Practice exam not found.');
    }
    return exam;
  }

  async startAttempt(customerId: string, practiceExamId: string) {
    const exam = await this.examRepo.findById(practiceExamId);
    if (!exam) throw new NotFoundException('Practice exam não encontrado.');
    if (!exam.is_active) throw new BadRequestException('Este exam não está disponível.');
    return this.attemptRepo.create(customerId, practiceExamId);
  }

  async getAttempt(id: string, customerId: string) {
    const attempt = await this.attemptRepo.findById(id);
    if (!attempt || attempt.customer_id !== customerId) throw new NotFoundException('Tentativa não encontrada.');
    return attempt;
  }

  async answerQuestion(attemptId: string, questionId: string, selectedOption: string, customerId: string) {
    const attempt = await this.attemptRepo.findById(attemptId);
    if (!attempt || attempt.customer_id !== customerId) throw new NotFoundException('Tentativa não encontrada.');
    if (attempt.status !== EAttemptStatus.IN_PROGRESS) throw new BadRequestException('Esta tentativa já foi finalizada.');

    const question = attempt.PracticeExam.Questions.find((q: any) => q.id === questionId);
    if (!question) throw new NotFoundException('Questão não encontrada nesta tentativa.');

    const isCorrect = question.correct_option === selectedOption;
    return this.attemptRepo.upsertResponse(attemptId, questionId, selectedOption, isCorrect);
  }

  async flagQuestion(attemptId: string, questionId: string, flagged: boolean, customerId: string) {
    const attempt = await this.attemptRepo.findById(attemptId);
    if (!attempt || attempt.customer_id !== customerId) throw new NotFoundException('Tentativa não encontrada.');
    if (attempt.status !== EAttemptStatus.IN_PROGRESS) throw new BadRequestException('Esta tentativa já foi finalizada.');
    await this.attemptRepo.setFlagged(attemptId, questionId, flagged);
  }

  async submitAttempt(attemptId: string, customerId: string) {
    const attempt = await this.attemptRepo.findById(attemptId);
    if (!attempt || attempt.customer_id !== customerId) throw new NotFoundException('Tentativa não encontrada.');
    if (attempt.status !== EAttemptStatus.IN_PROGRESS) throw new BadRequestException('Esta tentativa já foi finalizada.');

    const totalQuestions = attempt.PracticeExam.Questions.length;
    const correct = attempt.Responses.filter((r: any) => r.is_correct === true).length;
    const score = totalQuestions > 0 ? (correct / totalQuestions) * 100 : 0;

    const finished = await this.attemptRepo.finish(attemptId, EAttemptStatus.COMPLETED, Math.round(score * 100) / 100);
    return this.formatResult(finished);
  }

  async timedOutAttempt(attemptId: string, customerId: string) {
    const attempt = await this.attemptRepo.findById(attemptId);
    if (!attempt || attempt.customer_id !== customerId) throw new NotFoundException('Tentativa não encontrada.');
    if (attempt.status !== EAttemptStatus.IN_PROGRESS) throw new BadRequestException('Esta tentativa já foi finalizada.');

    const totalQuestions = attempt.PracticeExam.Questions.length;
    const correct = attempt.Responses.filter((r: any) => r.is_correct === true).length;
    const score = totalQuestions > 0 ? (correct / totalQuestions) * 100 : 0;

    const finished = await this.attemptRepo.finish(attemptId, EAttemptStatus.TIMED_OUT, Math.round(score * 100) / 100);
    return this.formatResult(finished);
  }

  async getAttemptResult(attemptId: string, customerId: string) {
    const attempt = await this.attemptRepo.findById(attemptId);
    if (!attempt || attempt.customer_id !== customerId) throw new NotFoundException('Tentativa não encontrada.');
    if (attempt.status === EAttemptStatus.IN_PROGRESS) throw new BadRequestException('Este exam ainda está em andamento.');
    return this.formatResult(attempt);
  }

  private formatResult(attempt: any) {
    const responseMap = new Map(attempt.Responses.map((r: any) => [r.question_id, r]));

    const questions = attempt.PracticeExam.Questions.map((q: any) => {
      const response = responseMap.get(q.id) as any;
      return {
        id: q.id,
        statement: q.statement,
        order: q.order,
        explanation: q.explanation,
        correct_option: q.correct_option,
        selected_option: response?.selected_option ?? null,
        is_correct: response?.is_correct ?? false,
        options: q.Options.map((o: any) => ({ label: o.label, text: o.text })),
      };
    });

    return {
      id: attempt.id,
      practice_exam_id: attempt.practice_exam_id,
      status: attempt.status,
      started_at: attempt.started_at,
      finished_at: attempt.finished_at,
      score: attempt.score,
      exam: {
        title: attempt.PracticeExam.title,
        section: attempt.PracticeExam.section,
        time_limit: attempt.PracticeExam.time_limit,
      },
      questions,
    };
  }

  getStudentHistory(customerId: string) {
    return this.attemptRepo.findByCustomer(customerId);
  }

  getAllAttemptsForAdmin() {
    return this.attemptRepo.findAllWithDetails();
  }

  async getAttemptResultForAdmin(attemptId: string) {
    const attempt = await this.attemptRepo.findById(attemptId);
    if (!attempt) throw new NotFoundException('Tentativa não encontrada.');
    return this.formatResult(attempt);
  }

  getAttemptsByExam(examId: string) {
    return this.attemptRepo.findByExam(examId);
  }

  async exportHistoryCSV(): Promise<string> {
    const attempts = await this.attemptRepo.findAllWithDetails();
    const rows: string[] = [
      'student_name,student_email,exam_title,started_at,finished_at,score,question_id,selected_option,correct_option,is_correct',
    ];

    for (const attempt of attempts) {
      const base = [
        `"${attempt.Customer.name}"`,
        `"${attempt.Customer.email}"`,
        `"${attempt.PracticeExam.title}"`,
        attempt.started_at.toISOString(),
        attempt.finished_at?.toISOString() ?? '',
        attempt.score ?? '',
      ];

      if (attempt.Responses.length === 0) {
        rows.push([...base, '', '', '', ''].join(','));
      } else {
        for (const r of attempt.Responses) {
          rows.push([
            ...base,
            r.Question.id,
            r.selected_option ?? '',
            r.Question.correct_option,
            r.is_correct ?? '',
          ].join(','));
        }
      }
    }

    return rows.join('\n');
  }
}
