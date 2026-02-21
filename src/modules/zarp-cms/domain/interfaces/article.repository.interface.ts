import { Article } from '../entities/article.entity';
import { EArticleStatus } from '../enums/article-status.enum';

export const ARTICLE_REPOSITORY = Symbol('ARTICLE_REPOSITORY');

export interface ArticleFilters {
  status?: EArticleStatus;
  authorId?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IArticleRepository {
  create(article: Article): Promise<Article>;
  findById(id: string): Promise<Article | null>;
  findBySlugAndBlogId(slug: string, blogId: string): Promise<Article | null>;
  findByBlogId(
    blogId: string,
    filters?: ArticleFilters,
  ): Promise<PaginatedResult<Article>>;
  update(id: string, data: Partial<Article>): Promise<Article>;
  delete(id: string): Promise<void>;
  countByAuthorId(authorId: string, status?: EArticleStatus): Promise<number>;
}
