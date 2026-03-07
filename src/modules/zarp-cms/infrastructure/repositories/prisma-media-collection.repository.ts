import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions/repository.exception';
import {
  IMediaCollectionRepository,
  IFindCollectionsParams,
} from '../../domain/interfaces/media-collection.repository.interface';
import { IPaginatedResult } from '../../domain/interfaces/media-asset.repository.interface';
import { MediaCollection } from '../../domain/entities/media-collection.entity';
import { ECollectionType } from '../../domain/enums/collection-type.enum';
import {
  Prisma,
  MediaCollection as PrismaMediaCollection,
} from '../../../../generated/prisma/client';

/**
 * PrismaMediaCollectionRepository
 * 
 * Prisma implementation of IMediaCollectionRepository interface.
 * Handles database operations for MediaCollection entities.
 * 
 * Responsibilities:
 * - Maps between domain entities and Prisma models
 * - Enforces tenant isolation and slug uniqueness
 * - Handles pagination and filtering
 * - Throws RepositoryException on database failures
 * 
 * @Injectable decorator enables NestJS dependency injection
 */
@Injectable()
export class PrismaMediaCollectionRepository implements IMediaCollectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Maps Prisma model to domain entity
   * Converts snake_case DB fields to camelCase entity properties
   * Parses JSON fields (allowed_mime_types)
   */
  private toDomain(prismaData: PrismaMediaCollection): MediaCollection {
    // Parse allowed_mime_types from JSON string to array
    let allowedMimeTypes: string[] | undefined;
    if (prismaData.allowed_mime_types) {
      try {
        allowedMimeTypes = JSON.parse(prismaData.allowed_mime_types);
      } catch {
        allowedMimeTypes = undefined;
      }
    }

    const collection = new MediaCollection({
      name: prismaData.name,
      slug: prismaData.slug,
      description: prismaData.description ?? undefined,
      type: prismaData.type as ECollectionType,
      max_file_size: prismaData.max_file_size ?? undefined,
      allowed_mime_types: allowedMimeTypes,
      max_items: prismaData.max_items ?? undefined,
      tenant_id: prismaData.tenant_id,
    });
    
    // Assign readonly/generated fields
    Object.assign(collection, {
      id: prismaData.id,
      created_at: prismaData.created_at,
      updated_at: prismaData.updated_at,
    });
    
    return collection;
  }

  async create(entity: MediaCollection): Promise<MediaCollection> {
    try {
      const data: Prisma.MediaCollectionUncheckedCreateInput = {
        name: entity.name,
        slug: entity.slug,
        description: entity.description,
        type: entity.type,
        max_file_size: entity.max_file_size,
        allowed_mime_types: entity.allowed_mime_types
          ? JSON.stringify(entity.allowed_mime_types)
          : null,
        max_items: entity.max_items,
        tenant_id: entity.tenant_id,
      };

      const created = await this.prisma.mediaCollection.create({ data });
      return this.toDomain(created);
    } catch (error) {
      throw new RepositoryException(
        'Failed to create media collection',
        'CREATE_FAILED',
        error,
      );
    }
  }

  async findById(id: string, tenantId: number): Promise<MediaCollection | null> {
    try {
      // Validate UUID format (12-character cuid)
      if (!id || typeof id !== 'string' || id.length !== 12) {
        throw new RepositoryException(
          'Invalid collection ID format: must be a 12-character UUID',
          'INVALID_ID_FORMAT',
        );
      }

      const record = await this.prisma.mediaCollection.findFirst({
        where: {
          id,
          tenant_id: tenantId,
        },
      });

      return record ? this.toDomain(record) : null;
    } catch (error) {
      if (error instanceof RepositoryException) {
        throw error;
      }
      throw new RepositoryException(
        'Failed to find media collection by ID',
        'FIND_FAILED',
        error,
      );
    }
  }

  async findBySlug(slug: string, tenantId: number): Promise<MediaCollection | null> {
    try {
      const record = await this.prisma.mediaCollection.findFirst({
        where: {
          slug,
          tenant_id: tenantId,
        },
      });

      return record ? this.toDomain(record) : null;
    } catch (error) {
      throw new RepositoryException(
        'Failed to find media collection by slug',
        'FIND_FAILED',
        error,
      );
    }
  }

  async findAll(
    params: IFindCollectionsParams,
  ): Promise<IPaginatedResult<MediaCollection>> {
    try {
      const where: Prisma.MediaCollectionWhereInput = {
        tenant_id: params.tenant_id,
      };

      if (params.type) {
        where.type = params.type;
      }

      const page = Number(params.page) || 1;
      const limit = Number(params.limit) || 20;
      const skip = (page - 1) * limit;

      const [records, total] = await Promise.all([
        this.prisma.mediaCollection.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.mediaCollection.count({ where }),
      ]);

      return {
        data: records.map((r) => this.toDomain(r)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new RepositoryException(
        'Failed to find media collections',
        'FIND_ALL_FAILED',
        error,
      );
    }
  }

  async update(
    id: string,
    data: Partial<MediaCollection>,
    tenantId: number,
  ): Promise<MediaCollection> {
    try {
      // Validate UUID format (12-character cuid)
      if (!id || typeof id !== 'string' || id.length !== 12) {
        throw new RepositoryException(
          'Invalid collection ID format: must be a 12-character UUID',
          'INVALID_ID_FORMAT',
        );
      }

      const updateData: Prisma.MediaCollectionUncheckedUpdateInput = {};

      if (data.name !== undefined) {
        updateData.name = data.name;
      }

      if (data.description !== undefined) {
        updateData.description = data.description;
      }

      if (data.type !== undefined) {
        updateData.type = data.type;
      }

      if (data.max_file_size !== undefined) {
        updateData.max_file_size = data.max_file_size;
      }

      if (data.allowed_mime_types !== undefined) {
        updateData.allowed_mime_types = data.allowed_mime_types
          ? JSON.stringify(data.allowed_mime_types)
          : null;
      }

      if (data.max_items !== undefined) {
        updateData.max_items = data.max_items;
      }

      const updated = await this.prisma.mediaCollection.update({
        where: {
          id,
          tenant_id: tenantId,
        },
        data: updateData,
      });

      return this.toDomain(updated);
    } catch (error) {
      if (error instanceof RepositoryException) {
        throw error;
      }
      throw new RepositoryException(
        'Failed to update media collection',
        'UPDATE_FAILED',
        error,
      );
    }
  }

  async delete(id: string, tenantId: number): Promise<void> {
    try {
      // Validate UUID format (12-character cuid)
      if (!id || typeof id !== 'string' || id.length !== 12) {
        throw new RepositoryException(
          'Invalid collection ID format: must be a 12-character UUID',
          'INVALID_ID_FORMAT',
        );
      }

      await this.prisma.mediaCollection.delete({
        where: {
          id,
          tenant_id: tenantId,
        },
      });
    } catch (error) {
      if (error instanceof RepositoryException) {
        throw error;
      }
      throw new RepositoryException(
        'Failed to delete media collection',
        'DELETE_FAILED',
        error,
      );
    }
  }
}
