import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions/repository.exception';
import { IMediaRelationRepository } from '../../domain/interfaces/media-relation.repository.interface';
import { MediaAssetRelation } from '../../domain/entities/media-asset-relation.entity';
import {
  Prisma,
  MediaAssetRelation as PrismaMediaAssetRelation,
} from '../../../../generated/prisma/client';

/**
 * PrismaMediaRelationRepository
 * 
 * Prisma implementation of IMediaRelationRepository interface.
 * Handles database operations for MediaAssetRelation entities.
 * 
 * Responsibilities:
 * - Maps between domain entities and Prisma models
 * - Manages polymorphic relations between assets and entities
 * - Handles display_order updates atomically
 * - Throws RepositoryException on database failures
 * 
 * Key Features:
 * - Supports polymorphic relations (entity_type + entity_id)
 * - Enforces uniqueness constraint on (asset_id, entity_type, entity_id, relation_type)
 * - Enables atomic reordering of multiple relations
 * 
 * @Injectable decorator enables NestJS dependency injection
 */
@Injectable()
export class PrismaMediaRelationRepository implements IMediaRelationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Maps Prisma model to domain entity
   * Converts snake_case DB fields to camelCase entity properties
   */
  private toDomain(prismaData: PrismaMediaAssetRelation): MediaAssetRelation {
    const relation = new MediaAssetRelation({
      asset_id: prismaData.asset_id,
      entity_type: prismaData.entity_type,
      entity_id: prismaData.entity_id,
      entity_id_type: prismaData.entity_id_type as 'uuid' | 'int',
      relation_type: prismaData.relation_type,
      display_order: prismaData.display_order ?? undefined,
      metadata: prismaData.metadata as Record<string, any> | undefined,
    });
    
    // Assign readonly/generated fields
    Object.assign(relation, {
      id: prismaData.id,
      created_at: prismaData.created_at,
    });
    
    return relation;
  }

  async create(entity: MediaAssetRelation): Promise<MediaAssetRelation> {
    try {
      const data: Prisma.MediaAssetRelationUncheckedCreateInput = {
        asset_id: entity.asset_id,
        entity_type: entity.entity_type,
        entity_id: entity.entity_id,
        entity_id_type: entity.entity_id_type,
        relation_type: entity.relation_type,
        display_order: entity.display_order,
        metadata: entity.metadata as Prisma.InputJsonValue,
      };

      const created = await this.prisma.mediaAssetRelation.create({ data });
      return this.toDomain(created);
    } catch (error) {
      throw new RepositoryException(
        'Failed to create media asset relation',
        'CREATE_FAILED',
        error,
      );
    }
  }

  async findByEntity(
    entityType: string,
    entityId: string,
    relationType?: string,
  ): Promise<MediaAssetRelation[]> {
    try {
      const where: Prisma.MediaAssetRelationWhereInput = {
        entity_type: entityType.toLowerCase(),
        entity_id: entityId,
      };

      if (relationType) {
        where.relation_type = relationType.toLowerCase();
      }

      const records = await this.prisma.mediaAssetRelation.findMany({
        where,
        orderBy: { display_order: 'asc' },
      });

      return records.map((r) => this.toDomain(r));
    } catch (error) {
      throw new RepositoryException(
        'Failed to find relations by entity',
        'FIND_FAILED',
        error,
      );
    }
  }

  async findByAsset(assetId: string): Promise<MediaAssetRelation[]> {
    try {
      const records = await this.prisma.mediaAssetRelation.findMany({
        where: { asset_id: assetId },
        orderBy: { created_at: 'desc' },
      });

      return records.map((r) => this.toDomain(r));
    } catch (error) {
      throw new RepositoryException(
        'Failed to find relations by asset',
        'FIND_FAILED',
        error,
      );
    }
  }

  async delete(
    assetId: string,
    entityType: string,
    entityId: string,
    relationType: string,
  ): Promise<void> {
    try {
      await this.prisma.mediaAssetRelation.deleteMany({
        where: {
          asset_id: assetId,
          entity_type: entityType.toLowerCase(),
          entity_id: entityId,
          relation_type: relationType.toLowerCase(),
        },
      });
    } catch (error) {
      throw new RepositoryException(
        'Failed to delete media asset relation',
        'DELETE_FAILED',
        error,
      );
    }
  }

  async deleteByAsset(assetId: string): Promise<void> {
    try {
      await this.prisma.mediaAssetRelation.deleteMany({
        where: { asset_id: assetId },
      });
    } catch (error) {
      throw new RepositoryException(
        'Failed to delete relations by asset',
        'DELETE_FAILED',
        error,
      );
    }
  }

  async updateOrder(
    relations: Array<{ id: string; display_order: number }>,
  ): Promise<void> {
    try {
      // Use transaction to ensure atomicity
      await this.prisma.$transaction(
        relations.map((rel) =>
          this.prisma.mediaAssetRelation.update({
            where: { id: rel.id },
            data: { display_order: rel.display_order },
          }),
        ),
      );
    } catch (error) {
      throw new RepositoryException(
        'Failed to update relation order',
        'UPDATE_ORDER_FAILED',
        error,
      );
    }
  }

  async exists(
    assetId: string,
    entityType: string,
    entityId: string,
    relationType: string,
  ): Promise<boolean> {
    try {
      const count = await this.prisma.mediaAssetRelation.count({
        where: {
          asset_id: assetId,
          entity_type: entityType.toLowerCase(),
          entity_id: entityId,
          relation_type: relationType.toLowerCase(),
        },
      });

      return count > 0;
    } catch (error) {
      throw new RepositoryException(
        'Failed to check relation existence',
        'EXISTS_FAILED',
        error,
      );
    }
  }
}
