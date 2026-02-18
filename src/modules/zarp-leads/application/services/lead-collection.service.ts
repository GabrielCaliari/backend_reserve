import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { CreateCollectionDto } from '../dtos/create-collection.dto';
import { UpdateCollectionDto } from '../dtos/update-collection.dto';
import { CollectionQueryDto } from '../dtos/collection-query.dto';
import { ILeadCollectionRepository, LEAD_COLLECTION_REPOSITORY } from '../../domain/interfaces/lead-collection.repository.interface';
import { LeadCollection } from '../../domain/entities/lead-collection.entity';
import { generateSlug } from '../../domain/utils/slug.util';
import { EAccessMode } from '../../domain/enums/access-mode.enum';
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
    const key = `ck_live_${crypto.randomBytes(32).toString('hex')}`;
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHmac('sha256', salt).update(key).digest('hex');
    return { key, hash, salt };
  }

  async createCollection(dto: CreateCollectionDto, tenantId: number): Promise<LeadCollection & { secretKey?: string }> {
    const slug = generateSlug(dto.name);
    
    const existing = await this.repository.findBySlugAndTenantId(slug, tenantId);
    if (existing) {
      throw new CollectionSlugConflictError(slug);
    }

    const collection = new LeadCollection({
      name: dto.name,
      slug,
      source: dto.source,
      accessMode: dto.access_mode || EAccessMode.public,
      allowedDomains: dto.allowed_domains || [],
      active: true,
      tenantId,
    });

    const created = await this.repository.create(collection);
    let secretKey: string | undefined;

    if (created.accessMode === EAccessMode.restricted) {
      const { key, hash, salt } = this.generateSecretKey();
      await this.repository.updateSecretKey(created.id!, hash, salt);
      secretKey = key;
    }

    // Return LeadCollection instance with optional secretKey property
    return Object.assign(created, { secretKey });
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

  async updateCollection(id: number, dto: UpdateCollectionDto, tenantId: number): Promise<LeadCollection & { secretKey?: string }> {
    const collection = await this.findCollectionById(id, tenantId);

    // Apply updates
    if (dto.name) {
      collection.name = dto.name;
      // Should we re-generate slug? Usually slugs are stable for SEO/links. 
      // Spec didn't say slug updates are allowed. We keep slug stable.
    }
    if (dto.source) collection.source = dto.source;
    if (dto.allowed_domains) collection.allowedDomains = dto.allowed_domains;
    if (dto.active !== undefined) collection.active = dto.active;

    // Handle access mode changes
    let secretKey: string | undefined;
    const oldMode = collection.accessMode;
    if (dto.access_mode && dto.access_mode !== oldMode) {
      collection.accessMode = dto.access_mode;

      if (dto.access_mode === EAccessMode.restricted) {
        // Switching TO restricted -> generate key
        const { key, hash, salt } = this.generateSecretKey();
        await this.repository.updateSecretKey(collection.id!, hash, salt);
        secretKey = key;
      } else if (oldMode === EAccessMode.restricted) {
        // Switching FROM restricted -> clear key
        await this.repository.clearSecretKey(collection.id!);
      }
    } else if (oldMode === EAccessMode.restricted) {
         // Keep existing key (no change or redundant update)
    }

    const updated = await this.repository.update(id, collection);
    // Return LeadCollection instance with optional secretKey property
    return Object.assign(updated, { secretKey });
  }

  async deactivateCollection(id: number, tenantId: number): Promise<LeadCollection> {
    const collection = await this.findCollectionById(id, tenantId);
    collection.active = false;
    return this.repository.update(id, collection);
  }

  async regenerateKey(id: number, tenantId: number): Promise<{ secretKey: string }> {
    const collection = await this.findCollectionById(id, tenantId);
    
    if (collection.accessMode !== EAccessMode.restricted) {
      throw new BadRequestException('Collection is not in restricted mode');
    }

    const { key, hash, salt } = this.generateSecretKey();
    await this.repository.updateSecretKey(collection.id!, hash, salt);
    
    return { secretKey: key };
  }
}
