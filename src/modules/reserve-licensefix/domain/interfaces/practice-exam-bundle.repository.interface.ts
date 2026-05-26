export const PRACTICE_EXAM_BUNDLE_REPOSITORY = 'PRACTICE_EXAM_BUNDLE_REPOSITORY';

export interface ICreateBundleData {
  title: string;
  description?: string;
  is_active?: boolean;
  stripe_product_id?: string;
  exam_ids: string[];
}

export interface IUpdateBundleData {
  title?: string;
  is_active?: boolean;
  stripe_product_id?: string;
  exam_ids?: string[];
}

export interface IPracticeExamBundleRepository {
  findByTenant(tenantId: string): Promise<any[]>;
  create(tenantId: string, data: ICreateBundleData): Promise<any>;
  update(bundleId: string, data: IUpdateBundleData): Promise<any>;
  delete(bundleId: string): Promise<void>;
}
