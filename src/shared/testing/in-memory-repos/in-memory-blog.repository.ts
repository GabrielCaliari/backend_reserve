import { IBlogRepository } from '../../../modules/zarp-cms/domain/interfaces/blog.repository.interface';
import { Blog } from '../../../modules/zarp-cms/domain/entities/blog.entity';
import { createId } from '@paralleldrive/cuid2';

export class InMemoryBlogRepository implements IBlogRepository {
  public blogs: Blog[] = [];

  async create(data: Blog): Promise<Blog> {
    const blog = new Blog({
      id: createId(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.blogs.push(blog);
    return blog;
  }

  async findById(id: string): Promise<Blog | null> {
    const blog = this.blogs.find((b) => b.id === id && b.active);
    return blog || null;
  }

  async findByNameAndTenantId(name: string, tenantId: string): Promise<Blog | null> {
    const blog = this.blogs.find((b) => b.name === name && b.tenantId === tenantId && b.active);
    return blog || null;
  }

  async findByTenantId(tenantId: string): Promise<Blog[]> {
    return this.blogs.filter((b) => b.tenantId === tenantId && b.active);
  }

  async findBySecretKey(secretKeyHash: string): Promise<Blog | null> {
    const blog = this.blogs.find((b) => b.secretKeyHash === secretKeyHash && b.active);
    return blog || null;
  }

  async update(id: string, data: Partial<Blog>): Promise<Blog> {
    const blog = this.blogs.find((b) => b.id === id);
    if (blog) {
      Object.assign(blog, data);
    }
    return blog!;
  }

  async delete(id: string): Promise<void> {
    const blog = this.blogs.find((b) => b.id === id);
    if (blog) {
      blog.active = false;
    }
  }

  // Test helpers
  seed(data: Partial<Blog>): Blog {
    const blog = new Blog({
      id: createId(),
      name: 'Test Blog',
      tenantId: '1',
      secretKeyHash: 'hash',
      secretKeySalt: 'salt',
      description: null,
      ...data,
    });
    this.blogs.push(blog);
    return blog;
  }

  clear(): void {
    this.blogs = [];
  }
}
