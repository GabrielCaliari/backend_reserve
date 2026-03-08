import {
  IArticleRepository,
} from '../../../modules/zarp-cms/domain/interfaces/article.repository.interface';

export class InMemoryArticleRepository implements IArticleRepository {
  private articles: any[] = [];
  private idCounter = 1;

  async create(data: any): Promise<any> {
    const article = {
      id: String(this.idCounter++),
      ...data,
      status: 'draft',
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.articles.push(article);
    return article;
  }

  async findById(id: string): Promise<any> {
    return this.articles.find((a) => a.id === id) || null;
  }

  async findBySlugAndBlogId(slug: string, blogId: string): Promise<any> {
    return this.articles.find((a) => a.slug === slug && a.blogId === blogId) || null;
  }

  async findByBlogId(blogId: string, options?: any): Promise<any> {
    const filtered = this.articles.filter((a) => a.blogId === blogId);
    return { data: filtered, total: filtered.length, page: 1, limit: 10, totalPages: 1 };
  }

  async findByTenantId(tenantId: string, options?: any): Promise<any> {
    const filtered = this.articles.filter((a) => a.tenantId === tenantId);
    return { data: filtered, total: filtered.length, page: 1, limit: 10, totalPages: 1 };
  }

  async countByAuthorId(authorId: string): Promise<number> {
    return this.articles.filter((a) => a.authorId === authorId).length;
  }

  async existsBySlugAndBlogId(slug: string, blogId: string): Promise<boolean> {
    return this.articles.some((a) => a.slug === slug && a.blogId === blogId);
  }

  async findAllByBlogId(blogId: string): Promise<any[]> {
    return this.articles.filter((a) => a.blogId === blogId);
  }

  async findPublishedByBlogId(blogId: string): Promise<any[]> {
    return this.articles
      .filter((a) => a.blogId === blogId && a.status === 'published')
      .sort((a, b) => {
        const left = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const right = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return right - left;
      });
  }

  async findPublishedBySlugAndBlogId(slug: string, blogId: string): Promise<any> {
    return (
      this.articles.find(
        (a) => a.slug === slug && a.blogId === blogId && a.status === 'published',
      ) || null
    );
  }

  async update(id: string, data: Partial<any>): Promise<any> {
    const index = this.articles.findIndex((a) => a.id === id);
    if (index === -1) return null;

    this.articles[index] = {
      ...this.articles[index],
      ...data,
      updatedAt: new Date(),
    };
    return this.articles[index];
  }

  async updateDisplayOrders(items: { id: string; display_order: number }[]): Promise<void> {
    items.forEach((item) => {
      const article = this.articles.find((a) => a.id === item.id);
      if (article) {
        article.updatedAt = new Date();
      }
    });
  }

  async delete(id: string): Promise<void> {
    const index = this.articles.findIndex((a) => a.id === id);
    if (index !== -1) {
      this.articles.splice(index, 1);
    }
  }

  // Helper methods for testing
  clear(): void {
    this.articles = [];
    this.idCounter = 1;
  }

  getAll(): any[] {
    return [...this.articles];
  }
}
