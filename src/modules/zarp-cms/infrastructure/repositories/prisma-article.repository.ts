import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import {
  IArticleRepository,
  ArticleFilters,
  PaginatedResult,
} from '../../domain/interfaces/article.repository.interface';
import { Article } from '../../domain/entities/article.entity';
import { EArticleStatus } from '../../domain/enums/article-status.enum';
import { Article as PrismaArticle } from '../../../../../src/generated/prisma/client';

@Injectable()
export class PrismaArticleRepository implements IArticleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(article: Article): Promise<Article> {
    try {
      const record = await this.prisma.article.create({
        data: {
          display_title: article.displayTitle,
          language: article.language,
          meta_title: article.metaTitle,
          meta_description: article.metaDescription,
          focus_keyword: article.focusKeyword,
          content: article.content,
          slug: article.slug,
          status: article.status,
          published_at: article.publishedAt,
          cover_image_id: article.coverImageId,
          author_id: article.authorId,
          blog_id: article.blogId,
          created_by: article.createdBy,
          last_edited_by: article.lastEditedBy,
        },
      });
      return this.toDomain(record);
    } catch (error) {
      throw new RepositoryException('Failed to create article', error);
    }
  }

  async findById(id: string): Promise<Article | null> {
    try {
      // Validate UUID format
      if (!this.isValidUUID(id)) {
        throw new RepositoryException('Invalid UUID format for article ID', null);
      }

      const record = await this.prisma.article.findUnique({
        where: { id },
      });
      return record ? this.toDomain(record) : null;
    } catch (error) {
      throw new RepositoryException('Failed to find article by ID', error);
    }
  }

  async findBySlugAndBlogId(slug: string, blogId: string): Promise<Article | null> {
    try {
      const record = await this.prisma.article.findUnique({
        where: {
          slug_blog_id: {
            slug,
            blog_id: blogId,
          },
        },
      });
      return record ? this.toDomain(record) : null;
    } catch (error) {
      throw new RepositoryException('Failed to find article by slug and blog ID', error);
    }
  }

  async findByBlogId(
    blogId: string,
    filters?: ArticleFilters,
  ): Promise<PaginatedResult<Article>> {
    try {
      const page = filters?.page ?? 1;
      const limit = filters?.limit ?? 10;
      const skip = (page - 1) * limit;

      const where: any = { blog_id: blogId };
      
      if (filters?.status) {
        where.status = filters.status;
      }
      
      if (filters?.authorId) {
        where.author_id = filters.authorId;
      }

      const [records, total] = await Promise.all([
        this.prisma.article.findMany({
          where,
          skip,
          take: limit,
          orderBy:
            filters?.status === EArticleStatus.published
              ? [{ published_at: 'desc' }, { created_at: 'desc' }]
              : { created_at: 'desc' },
        }),
        this.prisma.article.count({ where }),
      ]);

      return {
        data: records.map((record) => this.toDomain(record)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new RepositoryException('Failed to find articles by blog ID', error);
    }
  }

  async findByTenantId(
    tenantId: string,
    filters?: ArticleFilters,
  ): Promise<PaginatedResult<Article>> {
    try {
      const page = filters?.page ?? 1;
      const limit = filters?.limit ?? 10;
      const skip = (page - 1) * limit;

      const where: any = {
        Blog: { tenant_id: tenantId },
      };

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.authorId) {
        where.author_id = filters.authorId;
      }

      const [records, total] = await Promise.all([
        this.prisma.article.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.article.count({ where }),
      ]);

      return {
        data: records.map((record) => this.toDomain(record)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new RepositoryException('Failed to find articles by tenant ID', error);
    }
  }

  async update(id: string, data: Partial<Article>): Promise<Article> {
    try {
      // Validate UUID format
      if (!this.isValidUUID(id)) {
        throw new RepositoryException('Invalid UUID format for article ID', null);
      }

      const updateData: any = {};
      
      if (data.displayTitle !== undefined) updateData.display_title = data.displayTitle;
      if (data.language !== undefined) updateData.language = data.language;
      if (data.metaTitle !== undefined) updateData.meta_title = data.metaTitle;
      if (data.metaDescription !== undefined) updateData.meta_description = data.metaDescription;
      if (data.focusKeyword !== undefined) updateData.focus_keyword = data.focusKeyword;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.slug !== undefined) updateData.slug = data.slug;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.publishedAt !== undefined) updateData.published_at = data.publishedAt;
      if (data.scheduledAt !== undefined) updateData.scheduled_at = data.scheduledAt;
      if (data.coverImageId !== undefined) updateData.cover_image_id = data.coverImageId;
      if (data.authorId !== undefined) updateData.author_id = data.authorId;
      if (data.lastEditedBy !== undefined) updateData.last_edited_by = data.lastEditedBy;

      const record = await this.prisma.article.update({
        where: { id },
        data: updateData,
      });
      
      return this.toDomain(record);
    } catch (error) {
      throw new RepositoryException('Failed to update article', error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      // Validate UUID format
      if (!this.isValidUUID(id)) {
        throw new RepositoryException('Invalid UUID format for article ID', null);
      }

      await this.prisma.article.delete({
        where: { id },
      });
    } catch (error) {
      throw new RepositoryException('Failed to delete article', error);
    }
  }

  async countByAuthorId(authorId: string, status?: EArticleStatus): Promise<number> {
    try {
      // Validate UUID format
      if (!this.isValidUUID(authorId)) {
        throw new RepositoryException('Invalid UUID format for author ID', null);
      }

      const where: any = { author_id: authorId };

      if (status) {
        where.status = status;
      }

      return await this.prisma.article.count({ where });
    } catch (error) {
      throw new RepositoryException('Failed to count articles by author ID', error);
    }
  }

  async findScheduledDue(): Promise<Article[]> {
    try {
      const records = await this.prisma.article.findMany({
        where: {
          status: 'scheduled' as any,
          scheduled_at: { lte: new Date() },
        },
      });
      return records.map((record) => this.toDomain(record));
    } catch (error) {
      throw new RepositoryException('Failed to find scheduled articles due for publication', error);
    }
  }

  private toDomain(raw: PrismaArticle): Article {
    return new Article({
      id: raw.id,
      displayTitle: raw.display_title,
      language: raw.language,
      metaTitle: raw.meta_title,
      metaDescription: raw.meta_description,
      focusKeyword: raw.focus_keyword,
      content: raw.content,
      slug: raw.slug,
      status: raw.status as EArticleStatus,
      publishedAt: raw.published_at,
      scheduledAt: (raw as any).scheduled_at ?? null,
      coverImageId: raw.cover_image_id,
      authorId: raw.author_id,
      blogId: raw.blog_id,
      createdBy: raw.created_by,
      lastEditedBy: raw.last_edited_by,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    });
  }

  /**
   * Validates UUID format (12-character cuid)
   * @param id - The UUID string to validate
   * @returns true if valid UUID format, false otherwise
   */
  private isValidUUID(id: string): boolean {
    // cuid format: c + 24 alphanumeric chars (25 total)
    return /^[a-z][a-z0-9]{24}$/i.test(id);
  }
}
