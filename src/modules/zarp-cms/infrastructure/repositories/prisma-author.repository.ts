import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import {
  IAuthorRepository,
  AuthorFilters,
  PaginatedResult,
} from '../../domain/interfaces/author.repository.interface';
import { Author } from '../../domain/entities/author.entity';
import { Author as PrismaAuthor } from '../../../../../src/generated/prisma/client';
import { EArticleStatus } from '../../domain/enums/article-status.enum';

@Injectable()
export class PrismaAuthorRepository implements IAuthorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(author: Author): Promise<Author> {
    try {
      const record = await this.prisma.author.create({
        data: {
          first_name: author.firstName,
          last_name: author.lastName,
          biography: author.biography,
          avatar_id: author.avatarId,
          tenant_id: author.tenantId,
          active: author.active,
        },
      });
      return this.toDomain(record);
    } catch (error) {
      throw new RepositoryException('Failed to create author', error);
    }
  }

  async findById(id: string): Promise<Author | null> {
    try {
      // Validate UUID format
      if (!this.isValidUUID(id)) {
        console.log(`[DEBUG] Invalid author ID format: "${id}" (length: ${id.length})`);
        return null;
      }

      const record = await this.prisma.author.findUnique({
        where: { id },
      });
      
      if (!record) {
        console.log(`[DEBUG] Author not found in database: "${id}"`);
      }
      
      return record ? this.toDomain(record) : null;
    } catch (error) {
      throw new RepositoryException('Failed to find author by ID', error);
    }
  }

  async findByTenantId(
    tenantId: number,
    filters?: AuthorFilters,
  ): Promise<PaginatedResult<Author>> {
    try {
      const page = filters?.page ?? 1;
      const limit = filters?.limit ?? 10;
      const skip = (page - 1) * limit;

      const where: any = { tenant_id: tenantId };
      
      if (filters?.active !== undefined) {
        where.active = filters.active;
      }

      const [records, total] = await Promise.all([
        this.prisma.author.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.author.count({ where }),
      ]);

      return {
        data: records.map((record) => this.toDomain(record)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new RepositoryException('Failed to find authors by tenant ID', error);
    }
  }

  async update(id: string, data: Partial<Author>): Promise<Author> {
    try {
      // Validate UUID format
      if (!this.isValidUUID(id)) {
        throw new RepositoryException('Invalid UUID format for author ID', null);
      }

      const updateData: any = {};
      
      if (data.firstName !== undefined) updateData.first_name = data.firstName;
      if (data.lastName !== undefined) updateData.last_name = data.lastName;
      if (data.biography !== undefined) updateData.biography = data.biography;
      if (data.avatarId !== undefined) updateData.avatar_id = data.avatarId;
      if (data.active !== undefined) updateData.active = data.active;

      const record = await this.prisma.author.update({
        where: { id },
        data: updateData,
      });
      
      return this.toDomain(record);
    } catch (error) {
      throw new RepositoryException('Failed to update author', error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      // Validate UUID format
      if (!this.isValidUUID(id)) {
        throw new RepositoryException('Invalid UUID format for author ID', null);
      }

      await this.prisma.author.delete({
        where: { id },
      });
    } catch (error) {
      throw new RepositoryException('Failed to delete author', error);
    }
  }

  async hasPublishedArticles(authorId: string): Promise<boolean> {
    try {
      // Validate UUID format
      if (!this.isValidUUID(authorId)) {
        throw new RepositoryException('Invalid UUID format for author ID', null);
      }

      const count = await this.prisma.article.count({
        where: {
          author_id: authorId,
          status: EArticleStatus.published,
        },
      });
      return count > 0;
    } catch (error) {
      throw new RepositoryException('Failed to check if author has published articles', error);
    }
  }

  private toDomain(raw: PrismaAuthor): Author {
    return new Author({
      id: raw.id,
      firstName: raw.first_name,
      lastName: raw.last_name,
      biography: raw.biography,
      avatarId: raw.avatar_id,
      tenantId: raw.tenant_id,
      active: raw.active,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    });
  }

  /**
   * Validates cuid format (up to 25 characters)
   * @param id - The cuid string to validate
   * @returns true if valid cuid format, false otherwise
   */
  private isValidUUID(id: string): boolean {
    // cuid format: starts with 'c', followed by alphanumeric, length between 9-25 characters
    return typeof id === 'string' && id.length >= 9 && id.length <= 25 && /^c[a-z0-9]+$/i.test(id);
  }
}
