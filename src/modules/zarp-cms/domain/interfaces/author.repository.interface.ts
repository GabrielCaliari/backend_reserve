import { Author } from '../entities/author.entity';

export const AUTHOR_REPOSITORY = Symbol('AUTHOR_REPOSITORY');

export interface AuthorFilters {
  active?: boolean;
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

export interface IAuthorRepository {
  create(author: Author): Promise<Author>;
  findById(id: string): Promise<Author | null>;
  findByTenantId(
    tenantId: number,
    filters?: AuthorFilters,
  ): Promise<PaginatedResult<Author>>;
  update(id: string, data: Partial<Author>): Promise<Author>;
  delete(id: string): Promise<void>;
  hasPublishedArticles(authorId: string): Promise<boolean>;
}
