import { IBlogRepository, ICreateBlog } from '../../../modules/zarp-cms/domain/interfaces/blog.repository.interface';
import { Blog } from '../../../modules/zarp-cms/domain/entities/blog.entity';

export class InMemoryBlogRepository implements IBlogRepository {
  public blogs: Blog[] = [];
  private idCounter = 1;

  async create(data: ICreateBlog): Promise<Blog> {
    const blog = new Blog({
      id: this.idCounter++,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    });
    this.blogs.push(blog);
    return blog;
  }

  async findById(id: number): Promise<Blog | null> {
    const blog = this.blogs.find((b) => b.id === id && b.active);
    return blog || null;
  }

  async findBySlugAndTenantId(slug: string, tenantId: number): Promise<Blog | null> {
    const blog = this.blogs.find((b) => b.slug === slug && b.tenant_id === tenantId && b.active);
    return blog || null;
  }

  async findAllByTenantId(tenantId: number): Promise<Blog[]> {
    return this.blogs.filter((b) => b.tenant_id === tenantId && b.active);
  }

  async findBySecretKey(secretKeyHash: string): Promise<Blog | null> {
    const blog = this.blogs.find((b) => b.secret_key_hash === secretKeyHash && b.active);
    return blog || null;
  }

  async update(id: number, data: Partial<ICreateBlog>): Promise<Blog> {
    const blog = this.blogs.find((b) => b.id === id);
    if (blog) {
      Object.assign(blog, data);
      blog.updated_at = new Date();
    }
    return blog!;
  }

  async delete(id: number): Promise<void> {
    const blog = this.blogs.find((b) => b.id === id);
    if (blog) {
      blog.active = false;
      blog.updated_at = new Date();
    }
  }

  // Test helpers
  seed(data: Partial<Blog>): Blog {
    const blog = new Blog({
      id: this.idCounter++,
      name: 'Test Blog',
      slug: 'test-blog',
      tenant_id: 1,
      secret_key_hash: 'hash',
      secret_key_salt: 'salt',
      ...data,
    });
    this.blogs.push(blog);
    return blog;
  }

  clear(): void {
    this.blogs = [];
    this.idCounter = 1;
  }
}
