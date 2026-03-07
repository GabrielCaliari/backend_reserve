import { Blog } from '../entities/blog.entity';

export const BLOG_REPOSITORY = Symbol('BLOG_REPOSITORY');

export interface IBlogRepository {
  create(blog: Blog): Promise<Blog>;
  findById(id: string): Promise<Blog | null>;
  findBySecretKey(secretKeyHash: string): Promise<Blog | null>;
  findByNameAndTenantId(name: string, tenantId: string): Promise<Blog | null>;
  findByTenantId(tenantId: string): Promise<Blog[]>;
  update(id: string, data: Partial<Blog>): Promise<Blog>;
  delete(id: string): Promise<void>;
}
