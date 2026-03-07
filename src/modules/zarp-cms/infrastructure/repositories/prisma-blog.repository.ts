import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { IBlogRepository } from '../../domain/interfaces/blog.repository.interface';
import { Blog } from '../../domain/entities/blog.entity';
import { Blog as PrismaBlog } from '../../../../../src/generated/prisma/client';

@Injectable()
export class PrismaBlogRepository implements IBlogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(blog: Blog): Promise<Blog> {
    try {
      const record = await this.prisma.blog.create({
        data: {
          name: blog.name,
          description: blog.description,
          secret_key_hash: blog.secretKeyHash,
          secret_key_salt: blog.secretKeySalt,
          tenant_id: blog.tenantId,
          active: blog.active,
        },
      });
      return this.toDomain(record);
    } catch (error) {
      throw new RepositoryException('Failed to create blog', error);
    }
  }

  async findById(id: string): Promise<Blog | null> {
    try {
      const record = await this.prisma.blog.findUnique({
        where: { id },
      });
      return record && record.active ? this.toDomain(record) : null;
    } catch (error) {
      throw new RepositoryException('Failed to find blog by ID', error);
    }
  }

  async findBySecretKey(secretKeyHash: string): Promise<Blog | null> {
    try {
      const record = await this.prisma.blog.findFirst({
        where: {
          secret_key_hash: secretKeyHash,
          active: true,
        },
      });
      return record ? this.toDomain(record) : null;
    } catch (error) {
      throw new RepositoryException('Failed to find blog by secret key', error);
    }
  }

  async findByNameAndTenantId(name: string, tenantId: string): Promise<Blog | null> {
    try {
      const record = await this.prisma.blog.findUnique({
        where: {
          name_tenant_id: {
            name,
            tenant_id: tenantId,
          },
        },
      });
      return record && record.active ? this.toDomain(record) : null;
    } catch (error) {
      throw new RepositoryException('Failed to find blog by name and tenant ID', error);
    }
  }

  async findByTenantId(tenantId: string): Promise<Blog[]> {
    try {
      const records = await this.prisma.blog.findMany({
        where: {
          tenant_id: tenantId,
          active: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });
      return records.map((record) => this.toDomain(record));
    } catch (error) {
      throw new RepositoryException('Failed to find blogs by tenant ID', error);
    }
  }

  async update(id: string, data: Partial<Blog>): Promise<Blog> {
    try {
      const updateData: any = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.secretKeyHash !== undefined) updateData.secret_key_hash = data.secretKeyHash;
      if (data.secretKeySalt !== undefined) updateData.secret_key_salt = data.secretKeySalt;
      if (data.active !== undefined) updateData.active = data.active;

      const record = await this.prisma.blog.update({
        where: { id },
        data: updateData,
      });
      
      return this.toDomain(record);
    } catch (error) {
      throw new RepositoryException('Failed to update blog', error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.blog.update({
        where: { id },
        data: { active: false },
      });
    } catch (error) {
      throw new RepositoryException('Failed to delete blog', error);
    }
  }

  private toDomain(raw: PrismaBlog): Blog {
    return new Blog({
      id: raw.id,
      name: raw.name,
      description: raw.description,
      secretKeyHash: raw.secret_key_hash,
      secretKeySalt: raw.secret_key_salt,
      tenantId: raw.tenant_id,
      active: raw.active,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    });
  }
}
