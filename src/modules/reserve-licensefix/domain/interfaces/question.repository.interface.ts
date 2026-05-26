export const QUESTION_REPOSITORY = 'QUESTION_REPOSITORY';

export interface ICreateQuestionData {
  practice_exam_id: string;
  statement: string;
  correct_option: string;
  explanation?: string;
  order: number;
  options: { label: string; text: string }[];
}

export interface IUpdateQuestionData {
  statement?: string;
  correct_option?: string;
  explanation?: string;
  order?: number;
  options?: { label: string; text: string }[];
}

export interface IQuestionRepository {
  create(data: ICreateQuestionData): Promise<any>;
  findById(id: string): Promise<any | null>;
  findByExam(practiceExamId: string): Promise<any[]>;
  update(id: string, data: IUpdateQuestionData): Promise<any>;
  softDelete(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  hasResponses(id: string): Promise<boolean>;
}
