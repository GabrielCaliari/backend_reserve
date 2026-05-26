import { EAttemptStatus } from '../enums/attempt-status.enum';

export const EXAM_ATTEMPT_REPOSITORY = 'EXAM_ATTEMPT_REPOSITORY';

export interface IExamAttemptRepository {
  create(customerId: string, practiceExamId: string): Promise<any>;
  findById(id: string): Promise<any | null>;
  findByCustomer(customerId: string): Promise<any[]>;
  findByExam(practiceExamId: string): Promise<any[]>;
  findAllWithDetails(): Promise<any[]>;
  findByIdForAdmin(id: string): Promise<any | null>;
  findByCustomerForAdmin(customerId: string): Promise<any[]>;
  upsertResponse(attemptId: string, questionId: string, selectedOption: string | null, isCorrect: boolean | null, flagged?: boolean): Promise<any>;
  setFlagged(attemptId: string, questionId: string, flagged: boolean): Promise<void>;
  finish(id: string, status: EAttemptStatus, score: number): Promise<any>;
}
