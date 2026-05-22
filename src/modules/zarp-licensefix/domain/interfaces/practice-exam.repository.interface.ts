import { EExamSection } from '../enums/exam-section.enum';

export const PRACTICE_EXAM_REPOSITORY = 'PRACTICE_EXAM_REPOSITORY';

export interface ICreatePracticeExamData {
  tenant_id: string;
  title: string;
  section: EExamSection;
  time_limit: number;
  description?: string;
  is_active?: boolean;
}

export interface IUpdatePracticeExamData {
  title?: string;
  section?: EExamSection;
  time_limit?: number;
  description?: string;
  is_active?: boolean;
}

export interface IPracticeExamRepository {
  create(data: ICreatePracticeExamData): Promise<any>;
  findById(id: string): Promise<any | null>;
  findByIdForPreview(id: string): Promise<any | null>;
  findAllByTenant(tenantId: string): Promise<any[]>;
  findActiveByTenant(tenantId: string): Promise<any[]>;
  update(id: string, data: IUpdatePracticeExamData): Promise<any>;
  delete(id: string): Promise<void>;
}
