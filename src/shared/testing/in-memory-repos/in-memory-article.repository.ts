import {
  IArticleRepository,
  ICreateArticle,
} from '../../../modules/zarp-cms/domain/interfaces/article.repository.interface';

export class InMemoryArticleRepository implements IArticleRepository {
  private articles: any[] = [];
  private idCounter = 1;

  async create(data: ICreateArticle): Promise<any> {
    const article = {
      id: this.idCounter++,
      ...data,
      status: 'draft',
      display_order: 0,
      published_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.articles.push(article);
    return article;
  }

  async findById(id: number): Promise<any> {
    return this.articles.find((a) => a.id === id) || null;
  }

  async findBySlugAndBlogId(slug: string, blogId: number): Promise<any> {
    return this.articles.find((a) => a.slug === slug && a.blog_id === blogId) || null;
  }

  async existsBySlugAndBlogId(slug: string, blogId: number): Promise<boolean> {
    return this.articles.some((a) => a.slug === slug && a.blog_id === blogId);
  }

  async findAllByBlogId(blogId: number): Promise<any[]> {
    return this.articles.filter((a) => a.blog_id === blogId);
  }

  async findPublishedByBlogId(blogId: number): Promise<any[]> {
    return this.articles
      .filter((a) => a.blog_id === blogId && a.status === 'published')
      .sort((a, b) => a.display_order - b.display_order);
  }

  async findPublishedBySlugAndBlogId(slug: string, blogId: number): Promise<any> {
    return (
      this.articles.find(
        (a) => a.slug === slug && a.blog_id === blogId && a.status === 'published',
      ) || null
    );
  }

  async update(id: number, data: Partial<any>): Promise<any> {
    const index = this.articles.findIndex((a) => a.id === id);
    if (index === -1) return null;

    this.articles[index] = {
      ...this.articles[index],
      ...data,
      updated_at: new Date(),
    };
    return this.articles[index];
  }

  async updateDisplayOrders(items: { id: number; display_order: number }[]): Promise<void> {
    items.forEach((item) => {
      const article = this.articles.find((a) => a.id === item.id);
      if (article) {
        article.display_order = item.display_order;
        article.updated_at = new Date();
      }
    });
  }

  async delete(id: number): Promise<void> {
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
