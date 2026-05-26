import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { LeadCollection } from '../../domain/entities/lead-collection.entity';
import { ILeadCollectionRepository } from '../../domain/interfaces/lead-collection.repository.interface';
import { Prisma, LeadCollection as PrismaLeadCollection } from '../../../../generated/prisma/client';
import { CollectionQueryDto } from '../../application/dtos/collection-query.dto';

@Injectable()
export class LeadCollectionRepository implements ILeadCollectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(prismaData: PrismaLeadCollection): LeadCollection {
    return new LeadCollection({
      id: prismaData.id,
      name: prismaData.name,
      slug: prismaData.slug,
      source: prismaData.source,
      secretKeyHash: prismaData.secret_key_hash!,
      secretKeySalt: prismaData.secret_key_salt!,
      active: prismaData.active,
      tenantId: prismaData.tenant_id,
      createdAt: prismaData.created_at,
      updatedAt: prismaData.updated_at,
    });
  }

  async create(collection: LeadCollection): Promise<LeadCollection> {
    const data: Prisma.LeadCollectionUncheckedCreateInput = {
      name: collection.name,
      slug: collection.slug,
      source: collection.source,
      secret_key_hash: collection.secretKeyHash,
      secret_key_salt: collection.secretKeySalt,
      active: collection.active,
      tenant_id: collection.tenantId,
    };

    const created = await this.prisma.leadCollection.create({ data });
    return this.toEntity(created);
  }

  async findById(id: string, tenantId?: string): Promise<LeadCollection | null> {
    const where: Prisma.LeadCollectionWhereInput = { id };
    if (tenantId) where.tenant_id = tenantId;

    const record = await this.prisma.leadCollection.findFirst({ where });
    return record ? this.toEntity(record) : null;
  }

  async findBySlugAndTenantId(slug: string, tenantId: string): Promise<LeadCollection | null> {
    const record = await this.prisma.leadCollection.findFirst({
      where: { slug, tenant_id: tenantId },
    });
    return record ? this.toEntity(record) : null;
  }

  async findBySlug(slug: string): Promise<LeadCollection | null> {
    const record = await this.prisma.leadCollection.findFirst({
      where: { slug },
    });
    return record ? this.toEntity(record) : null;
  }

  async findBySecretKey(hash: string): Promise<LeadCollection | null> {
    const record = await this.prisma.leadCollection.findFirst({
      where: { secret_key_hash: hash, active: true },
    });
    return record ? this.toEntity(record) : null;
  }

  async findAllByTenantId(tenantId: string, query?: CollectionQueryDto): Promise<{ collections: LeadCollection[]; total: number }> {
    const where: Prisma.LeadCollectionWhereInput = { tenant_id: tenantId };
    if (query?.active !== undefined) where.active = query.active;

    const [records, total] = await Promise.all([
      this.prisma.leadCollection.findMany({
        where,
        skip: query && query.page && query.limit ? (query.page - 1) * query.limit : undefined,
        take: query?.limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.leadCollection.count({ where }),
    ]);

    return {
      collections: records.map(r => this.toEntity(r)),
      total,
    };
  }

  async findAll(query?: CollectionQueryDto & { tenant_id?: string }): Promise<{ collections: LeadCollection[]; total: number }> {
    const where: Prisma.LeadCollectionWhereInput = {};
    if (query?.tenant_id) where.tenant_id = query.tenant_id;
    if (query?.active !== undefined) where.active = query.active;

    const [records, total] = await Promise.all([
      this.prisma.leadCollection.findMany({
        where,
        skip: query && query.page && query.limit ? (query.page - 1) * query.limit : undefined,
        take: query?.limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.leadCollection.count({ where }),
    ]);

    return {
      collections: records.map(r => this.toEntity(r)),
      total,
    };
  }

  async update(id: string, updates: Partial<LeadCollection>): Promise<LeadCollection> {
    const data: Prisma.LeadCollectionUncheckedUpdateInput = {};
    
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.source !== undefined) data.source = updates.source;
    if (updates.active !== undefined) data.active = updates.active;
    if (updates.secretKeyHash !== undefined) data.secret_key_hash = updates.secretKeyHash;
    if (updates.secretKeySalt !== undefined) data.secret_key_salt = updates.secretKeySalt;

    const updated = await this.prisma.leadCollection.update({
      where: { id },
      data,
    });
    return this.toEntity(updated);
  }

  async count(tenantId: string): Promise<number> {
    return this.prisma.leadCollection.count({ where: { tenant_id: tenantId } });
  }
}
