import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  IPracticeExamRepository,
  PRACTICE_EXAM_REPOSITORY,
  ICreatePracticeExamData,
  IUpdatePracticeExamData,
} from '../../domain/interfaces/practice-exam.repository.interface';
import {
  IQuestionRepository,
  QUESTION_REPOSITORY,
  ICreateQuestionData,
  IUpdateQuestionData,
} from '../../domain/interfaces/question.repository.interface';

@Injectable()
export class PracticeExamAdminUseCase {
  constructor(
    @Inject(PRACTICE_EXAM_REPOSITORY) private readonly examRepo: IPracticeExamRepository,
    @Inject(QUESTION_REPOSITORY) private readonly questionRepo: IQuestionRepository,
  ) {}

  // ─── Practice Exam CRUD ───────────────────────────────────────────────────

  createExam(tenantId: string, data: Omit<ICreatePracticeExamData, 'tenant_id'>) {
    return this.examRepo.create({ ...data, tenant_id: tenantId });
  }

  listExams(tenantId: string) {
    return this.examRepo.findAllByTenant(tenantId);
  }

  async getExam(id: string) {
    const exam = await this.examRepo.findById(id);
    if (!exam) throw new NotFoundException('Practice exam não encontrado.');
    return exam;
  }

  async updateExam(id: string, data: IUpdatePracticeExamData) {
    await this.getExam(id);
    return this.examRepo.update(id, data);
  }

  async deleteExam(id: string) {
    await this.getExam(id);
    await this.examRepo.delete(id);
  }

  // ─── Question CRUD ────────────────────────────────────────────────────────

  async createQuestion(practiceExamId: string, data: Omit<ICreateQuestionData, 'practice_exam_id'>) {
    const exam = await this.examRepo.findById(practiceExamId);
    if (!exam) throw new NotFoundException('Practice exam não encontrado.');
    if (data.options.length !== 4) throw new BadRequestException('Questão deve ter exatamente 4 opções.');
    return this.questionRepo.create({ ...data, practice_exam_id: practiceExamId });
  }

  async listQuestions(practiceExamId: string) {
    return this.questionRepo.findByExam(practiceExamId);
  }

  async updateQuestion(id: string, data: IUpdateQuestionData) {
    const question = await this.questionRepo.findById(id);
    if (!question) throw new NotFoundException('Questão não encontrada.');
    if (data.options && data.options.length !== 4) throw new BadRequestException('Questão deve ter exatamente 4 opções.');
    return this.questionRepo.update(id, data);
  }

  async deleteQuestion(id: string) {
    const question = await this.questionRepo.findById(id);
    if (!question) throw new NotFoundException('Questão não encontrada.');
    const hasResponses = await this.questionRepo.hasResponses(id);
    if (hasResponses) {
      await this.questionRepo.softDelete(id);
    } else {
      await this.questionRepo.hardDelete(id);
    }
  }
}
