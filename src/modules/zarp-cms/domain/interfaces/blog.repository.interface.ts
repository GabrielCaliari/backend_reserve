export interface ICreateBlog {
  name: string;
  description?: string;
  slug: string;
  secret_key_hash: string;
  secret_key_salt: string;
  tenant_id: number;
}

export interface IBlogRepository {
  create(data: ICreateBlog): Promise<any>;
  findById(id: number): Promise<any>;
  findBySlugAndTenantId(slug: string, tenantId: number): Promise<any>;
  findAllByTenantId(tenantId: number): Promise<any[]>;
  findBySecretKey(secretKeyHash: string): Promise<any>;
  update(id: number, data: Partial<ICreateBlog>): Promise<any>;
  delete(id: number): Promise<void>;
}

export const BLOG_REPOSITORY = Symbol('BLOG_REPOSITORY');
