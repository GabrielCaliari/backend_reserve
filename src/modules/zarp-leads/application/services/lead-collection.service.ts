import { Injectable, Inject } from '@nestjs/common';
import { CreateCollectionDto } from '../dtos/create-collection.dto';
import { UpdateCollectionDto } from '../dtos/update-collection.dto';
import { CollectionQueryDto } from '../dtos/collection-query.dto';
import { ILeadCollectionRepository, LEAD_COLLECTION_REPOSITORY } from '../../domain/interfaces/lead-collection.repository.interface';
import { LeadCollection } from '../../domain/entities/lead-collection.entity';
import { generateSlug } from '../../domain/utils/slug.util';
import { CollectionSlugConflictError } from '../../domain/errors/collection-slug-conflict.error';
import { CollectionNotFoundError } from '../../domain/errors/collection-not-found.error';
import * as crypto from 'crypto';

@Injectable()
export class LeadCollectionService {
  constructor(
    @Inject(LEAD_COLLECTION_REPOSITORY)
    private readonly repository: ILeadCollectionRepository,
  ) {}

  private generateSecretKey(): { key: string; hash: string; salt: string } {
    const key = crypto.randomBytes(32).toString('hex');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    return { key, hash, salt };
  }

  async createCollection(dto: CreateCollectionDto, tenantId: number): Promise<LeadCollection & { secretKey: string }> {
    const slug = generateSlug(dto.name);
    
    const existing = await this.repository.findBySlugAndTenantId(slug, tenantId);
    if (existing) {
      throw new CollectionSlugConflictError(slug);
    }

    const { key, hash, salt } = this.generateSecretKey();

    const collection = new LeadCollection({
      name: dto.name,
      slug,
      source: dto.source,
      secretKeyHash: hash,
      secretKeySalt: salt,
      active: true,
      tenantId,
    });

    const created = await this.repository.create(collection);

    // Return LeadCollection instance with secretKey property (only shown once)
    return Object.assign(created, { secretKey: key });
  }

  async findCollections(query: CollectionQueryDto, tenantId: number): Promise<{ data: LeadCollection[]; meta: { total: number; page: number; limit: number } }> {
    const { collections, total } = await this.repository.findAllByTenantId(tenantId, query);
    return {
      data: collections,
      meta: {
        total,
        page: query.page || 1,
        limit: query.limit || 10,
      },
    };
  }

  async findCollectionById(id: number, tenantId: number): Promise<LeadCollection> {
    const collection = await this.repository.findById(id, tenantId);
    if (!collection) {
      throw new CollectionNotFoundError(id);
    }
    return collection;
  }

  async findBySlug(slug: string): Promise<LeadCollection | null> {
    return this.repository.findBySlug(slug);
  }

  async findBySecretKey(hash: string): Promise<LeadCollection | null> {
    return this.repository.findBySecretKey(hash);
  }

  async updateCollection(id: number, dto: UpdateCollectionDto, tenantId: number): Promise<LeadCollection> {
    const collection = await this.findCollectionById(id, tenantId);

    // Apply updates
    const updates: Partial<LeadCollection> = {};
    if (dto.name) updates.name = dto.name;
    if (dto.source) updates.source = dto.source;
    if (dto.active !== undefined) updates.active = dto.active;

    const updated = await this.repository.update(id, updates);
    return updated;
  }

  async deactivateCollection(id: number, tenantId: number): Promise<LeadCollection> {
    const collection = await this.findCollectionById(id, tenantId);
    collection.active = false;
    return this.repository.update(id, collection);
  }

  async regenerateSecretKey(id: number, tenantId: number): Promise<{ secretKey: string }> {
    const collection = await this.findCollectionById(id, tenantId);

    const { key, hash, salt } = this.generateSecretKey();
    
    await this.repository.update(collection.id!, {
      secretKeyHash: hash,
      secretKeySalt: salt,
    });
    
    return { secretKey: key };
  }
}
