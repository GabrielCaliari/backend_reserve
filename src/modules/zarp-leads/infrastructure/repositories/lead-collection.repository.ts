import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { LeadCollection } from '../../domain/entities/lead-collection.entity';
import { ILeadCollectionRepository } from '../../domain/interfaces/lead-collection.repository.interface';
import { EAccessMode } from '../../domain/enums/access-mode.enum';
import { ECollectionAccessMode, Prisma, LeadCollection as PrismaLeadCollection } from '../../../../generated/prisma/client';
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
      accessMode: prismaData.access_mode as EAccessMode,
      allowedDomains: prismaData.allowed_domains,
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
      access_mode: collection.accessMode as ECollectionAccessMode,
      allowed_domains: collection.allowedDomains,
      active: collection.active,
      tenant_id: collection.tenantId,
      // infrastructure fields managed here or by caller?
      // secret_key_hash etc are not on entity. They will be handled via update or separate args if generated.
      // Wait, create might need secret key hash if restricted.
      // But domain entity creates doesn't have secret key logic yet.
      // We'll update the entity definition or pass secrets separately?
      // For now, create assumes no restricted key yet or we pass it?
      // Actually, LeadCollectionService handles key generation. It needs to pass hash during create if mode is restricted.
      // The entity definition on plan.md explicitly said secret keys are infrastructure concerns.
      // But creating a restricted collection requires storing the hash.
      // I'll add optional secret_key_hash to update/create if needed, but repo interface takes Entity.
      // The correct pattern is: repository methods accept Entity + optional implementation details or Entity should carry the *value object* of credentials if needed.
      // Or simply, the service creates with mode=restricted, thus it generates generic key, then updates it? No, atomic creation is better.
      // I'll check how Blog repo handles it.
      // For now, I'll just map the base entity fields. Key generation logic will use update().
    };

    const created = await this.prisma.leadCollection.create({ data });
    return this.toEntity(created);
  }

  async findById(id: number, tenantId?: number): Promise<LeadCollection | null> {
    const where: Prisma.LeadCollectionWhereInput = { id };
    if (tenantId) where.tenant_id = tenantId;

    const record = await this.prisma.leadCollection.findFirst({ where });
    return record ? this.toEntity(record) : null;
  }

  async findBySlugAndTenantId(slug: string, tenantId: number): Promise<LeadCollection | null> {
    const record = await this.prisma.leadCollection.findFirst({
      where: { slug, tenant_id: tenantId },
    });
    return record ? this.toEntity(record) : null;
  }

  async findAllByTenantId(tenantId: number, query?: CollectionQueryDto): Promise<{ collections: LeadCollection[]; total: number }> {
    const where: Prisma.LeadCollectionWhereInput = { tenant_id: tenantId };
    if (query?.access_mode) where.access_mode = query.access_mode as ECollectionAccessMode;
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
      collections: records.map(this.toEntity),
      total,
    };
  }

  async findAll(query?: CollectionQueryDto & { tenant_id?: number }): Promise<{ collections: LeadCollection[]; total: number }> {
    const where: Prisma.LeadCollectionWhereInput = {};
    if (query?.tenant_id) where.tenant_id = query.tenant_id;
    if (query?.access_mode) where.access_mode = query.access_mode as ECollectionAccessMode;
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
      collections: records.map(this.toEntity),
      total,
    };
  }

  async findBySecretKey(hash: string): Promise<LeadCollection | null> {
    const record = await this.prisma.leadCollection.findFirst({
      where: { secret_key_hash: hash },
    });
    return record ? this.toEntity(record) : null;
  }

  async findBySlug(slug: string): Promise<LeadCollection | null> {
    const record = await this.prisma.leadCollection.findUnique({
      where: { slug },
    });
    return record ? this.toEntity(record) : null;
  }

  async getSecrets(id: number): Promise<{ secret_key_hash: string; secret_key_salt: string } | null> {
    const record = await this.prisma.leadCollection.findUnique({
      where: { id },
      select: { secret_key_hash: true, secret_key_salt: true },
    });
    
    if (!record || !record.secret_key_hash || !record.secret_key_salt) return null;
    
    return {
      secret_key_hash: record.secret_key_hash,
      secret_key_salt: record.secret_key_salt,
    };
  }

  async update(id: number, collection: LeadCollection): Promise<LeadCollection> {
    // Need to handle partial updates or full entity replacement?
    // Entity is usually full state. But we don't carry secret_key_hash in entity.
    // So update might wipe secret key if we just replace fields?
    // No, entity fields map to DB fields. If entity doesn't have secret key field, we don't update it in DB unless we explicitly handle it.
    // Here we map entity fields to data.
    const data: Prisma.LeadCollectionUncheckedUpdateInput = {
      name: collection.name,
      source: collection.source,
      access_mode: collection.accessMode as ECollectionAccessMode,
      allowed_domains: collection.allowedDomains,
      active: collection.active,
      // Secret key hash is NOT updated here because it's not in the entity.
      // This implies we need a specific method for updating secrets or extended entity.
      // But for now, general update is covered.
    };

    const updated = await this.prisma.leadCollection.update({
      where: { id },
      data,
    });
    return this.toEntity(updated);
  }

  async count(tenantId: number): Promise<number> {
    return this.prisma.leadCollection.count({ where: { tenant_id: tenantId } });
  }

  // Extra helper to update secret key explicitly if needed by Service
  async updateSecretKey(id: number, hash: string, salt: string): Promise<void> {
    await this.prisma.leadCollection.update({
      where: { id },
      data: { secret_key_hash: hash, secret_key_salt: salt },
    });
  }

  async clearSecretKey(id: number): Promise<void> {
    await this.prisma.leadCollection.update({
      where: { id },
      data: { secret_key_hash: null, secret_key_salt: null },
    });
  }
}
