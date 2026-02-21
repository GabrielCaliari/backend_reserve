import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions/repository.exception';
import {
  IMediaAssetRepository,
  IFindAssetsParams,
  IPaginatedResult,
} from '../../domain/interfaces/media-asset.repository.interface';
import { MediaAsset } from '../../domain/entities/media-asset.entity';
import { EAssetStatus } from '../../domain/enums/asset-status.enum';
import {
  Prisma,
  MediaAsset as PrismaMediaAsset,
} from '../../../../generated/prisma/client';

/**
 * PrismaMediaAssetRepository
 * 
 * Prisma implementation of IMediaAssetRepository interface.
 * Handles database operations for MediaAsset entities.
 * 
 * Responsibilities:
 * - Maps between domain entities and Prisma models
 * - Enforces tenant isolation at database level
 * - Handles pagination and filtering
 * - Validates UUID format for all ID parameters
 * - Throws RepositoryException on database failures
 * 
 * @Injectable decorator enables NestJS dependency injection
 * 
 * **Validates: Requirements 15.6**
 */
@Injectable()
export class PrismaMediaAssetRepository implements IMediaAssetRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates UUID format (12-character cuid)
   * @param id - The UUID string to validate
   * @returns true if valid UUID format, false otherwise
   */
  private isValidUUID(id: string): boolean {
    // cuid format: 12 characters, alphanumeric
    return /^[a-z0-9]{12}$/i.test(id);
  }

  /**
   * Maps Prisma model to domain entity
   * Converts snake_case DB fields to camelCase entity properties
   */
  private toDomain(prismaData: PrismaMediaAsset): MediaAsset {
    const asset = new MediaAsset({
      url: prismaData.url,
      storage_key: prismaData.storage_key,
      filename: prismaData.filename,
      mime_type: prismaData.mime_type,
      file_size: prismaData.file_size,
      width: prismaData.width ?? undefined,
      height: prismaData.height ?? undefined,
      alt_text: prismaData.alt_text ?? undefined,
      metadata: prismaData.metadata as Record<string, any> | undefined,
      status: prismaData.status as EAssetStatus,
      collection_id: prismaData.collection_id,
      tenant_id: prismaData.tenant_id,
      created_by: prismaData.created_by,
    });
    
    // Assign readonly/generated fields
    Object.assign(asset, {
      id: prismaData.id,
      created_at: prismaData.created_at,
      updated_at: prismaData.updated_at,
    });
    
    return asset;
  }

  async create(entity: MediaAsset): Promise<MediaAsset> {
    try {
      const data: Prisma.MediaAssetUncheckedCreateInput = {
        url: entity.url,
        storage_key: entity.storage_key,
        filename: entity.filename,
        mime_type: entity.mime_type,
        file_size: entity.file_size,
        width: entity.width,
        height: entity.height,
        alt_text: entity.alt_text,
        metadata: entity.metadata as Prisma.InputJsonValue,
        status: entity.status,
        collection_id: entity.collection_id,
        tenant_id: entity.tenant_id,
        created_by: entity.created_by,
      };

      const created = await this.prisma.mediaAsset.create({ data });
      return this.toDomain(created);
    } catch (error) {
      throw new RepositoryException('Failed to create media asset', 'CREATE_FAILED', error);
    }
  }

  async findById(id: string, tenantId: number): Promise<MediaAsset | null> {
    try {
      // Validate UUID format
      if (!this.isValidUUID(id)) {
        return null;
      }

      const record = await this.prisma.mediaAsset.findFirst({
        where: {
          id,
          tenant_id: tenantId,
        },
      });

      return record ? this.toDomain(record) : null;
    } catch (error) {
      throw new RepositoryException('Failed to find media asset by ID', 'FIND_FAILED', error);
    }
  }

  async findAll(params: IFindAssetsParams): Promise<IPaginatedResult<MediaAsset>> {
    try {
      const where: Prisma.MediaAssetWhereInput = {
        tenant_id: params.tenant_id,
      };

      if (params.collection_id) {
        where.collection_id = params.collection_id;
      }

      if (params.status) {
        where.status = params.status;
      }

      if (params.mime_type) {
        where.mime_type = params.mime_type;
      }

      const page = params.page || 1;
      const limit = params.limit || 20;
      const skip = (page - 1) * limit;

      const [records, total] = await Promise.all([
        this.prisma.mediaAsset.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.mediaAsset.count({ where }),
      ]);

      return {
        data: records.map((r) => this.toDomain(r)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new RepositoryException('Failed to find media assets', 'FIND_ALL_FAILED', error);
    }
  }

  async update(
    id: string,
    data: Partial<MediaAsset>,
    tenantId: number,
  ): Promise<MediaAsset> {
    try {
      // Validate UUID format
      if (!this.isValidUUID(id)) {
        throw new RepositoryException('Invalid UUID format for media asset ID', 'INVALID_UUID');
      }

      const updateData: Prisma.MediaAssetUncheckedUpdateInput = {};

      // Only allow updating specific fields (alt_text and metadata per requirements)
      if (data.alt_text !== undefined) {
        updateData.alt_text = data.alt_text;
      }

      if (data.metadata !== undefined) {
        updateData.metadata = data.metadata as Prisma.InputJsonValue;
      }

      // Also allow status updates for processing workflows
      if (data.status !== undefined) {
        updateData.status = data.status;
      }

      const updated = await this.prisma.mediaAsset.update({
        where: {
          id,
          tenant_id: tenantId,
        },
        data: updateData,
      });

      return this.toDomain(updated);
    } catch (error) {
      throw new RepositoryException('Failed to update media asset', 'UPDATE_FAILED', error);
    }
  }

  async delete(id: string, tenantId: number): Promise<void> {
    try {
      // Validate UUID format
      if (!this.isValidUUID(id)) {
        throw new RepositoryException('Invalid UUID format for media asset ID', 'INVALID_UUID');
      }

      await this.prisma.mediaAsset.delete({
        where: {
          id,
          tenant_id: tenantId,
        },
      });
    } catch (error) {
      throw new RepositoryException('Failed to delete media asset', 'DELETE_FAILED', error);
    }
  }

  async countByCollection(collectionId: string, tenantId: number): Promise<number> {
    try {
      // Validate UUID format
      if (!this.isValidUUID(collectionId)) {
        throw new RepositoryException('Invalid UUID format for collection ID', 'INVALID_UUID');
      }

      return await this.prisma.mediaAsset.count({
        where: {
          collection_id: collectionId,
          tenant_id: tenantId,
        },
      });
    } catch (error) {
      throw new RepositoryException(
        'Failed to count assets by collection',
        'COUNT_FAILED',
        error,
      );
    }
  }
}
