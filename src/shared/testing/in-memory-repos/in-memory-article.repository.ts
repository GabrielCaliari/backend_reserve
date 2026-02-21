import {
  IArticleRepository,
} from '../../../modules/zarp-cms/domain/interfaces/article.repository.interface';
import { Article } from '../../../modules/zarp-cms/domain/entities/article.entity';

export class InMemoryArticleRepository implements IArticleRepository {
  private articles: any[] = [];
  private idCounter = 1;

  async create(data: any): Promise<any> {
    const article = {
      id: String(this.idCounter++),
      ...data,
      status: 'draft',
      displayOrder: 0,
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
    return this.articles.filter((a) => a.blogId === blogId);
  }

  async countByAuthorId(authorId: string): Promise<number> {
    return this.articles.filter((a) => a.authorId === authorId).length;
  }

  async existsBySlugAndBlogId(slug: string, blogId: string): Promise<boolean> {
    return this.articles.some((a) => a.slug === slug && a.blog_id === blogId);
  }

  async findAllByBlogId(blogId: string): Promise<any[]> {
    return this.articles.filter((a) => a.blog_id === blogId);
  }

  async findPublishedByBlogId(blogId: string): Promise<any[]> {
    return this.articles
      .filter((a) => a.blog_id === blogId && a.status === 'published')
      .sort((a, b) => a.display_order - b.display_order);
  }

  async findPublishedBySlugAndBlogId(slug: string, blogId: string): Promise<any> {
    return (
      this.articles.find(
        (a) => a.slug === slug && a.blog_id === blogId && a.status === 'published',
      ) || null
    );
  }

  async update(id: string, data: Partial<any>): Promise<any> {
    const index = this.articles.findIndex((a) => a.id === id);
    if (index === -1) return null;

    this.articles[index] = {
      ...this.articles[index],
      ...data,
      updated_at: new Date(),
    };
    return this.articles[index];
  }

  async updateDisplayOrders(items: { id: string; display_order: number }[]): Promise<void> {
    items.forEach((item) => {
      const article = this.articles.find((a) => a.id === item.id);
      if (article) {
        article.display_order = item.display_order;
        article.updated_at = new Date();
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
