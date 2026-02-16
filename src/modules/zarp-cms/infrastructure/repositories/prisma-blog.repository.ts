import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { RepositoryException } from '@/shared/exceptions';
import { IBlogRepository, ICreateBlog } from '@/modules/zarp-cms/domain/interfaces/blog.repository.interface';

@Injectable()
export class PrismaBlogRepository implements IBlogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: ICreateBlog) {
    try {
      return await this.prisma.blog.create({
        data,
      });
    } catch (error) {
      throw new RepositoryException('Error creating blog.', error);
    }
  }

  async findById(id: number) {
    try {
      const blog = await this.prisma.blog.findUnique({
        where: { id },
      });
      return blog && blog.active ? blog : null;
    } catch (error) {
      throw new RepositoryException('Error finding blog by ID.', error);
    }
  }

  async findBySlugAndTenantId(slug: string, tenantId: number) {
    try {
      const blog = await this.prisma.blog.findUnique({
        where: {
          slug_tenant_id: {
            slug,
            tenant_id: tenantId,
          },
        },
      });
      return blog && blog.active ? blog : null;
    } catch (error) {
      throw new RepositoryException('Error finding blog by slug and tenant ID.', error);
    }
  }

  async findAllByTenantId(tenantId: number) {
    try {
      return await this.prisma.blog.findMany({
        where: {
          tenant_id: tenantId,
          active: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });
    } catch (error) {
      throw new RepositoryException('Error finding blogs by tenant ID.', error);
    }
  }

  async findBySecretKey(secretKeyHash: string) {
    try {
      // secret_key_hash is not unique in DB index, so use findFirst
      const blog = await this.prisma.blog.findFirst({
        where: {
          secret_key_hash: secretKeyHash,
          active: true,
        },
      });
      return blog;
    } catch (error) {
      throw new RepositoryException('Error finding blog by secret key.', error);
    }
  }

  async update(id: number, data: Partial<ICreateBlog>) {
    try {
      return await this.prisma.blog.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw new RepositoryException('Error updating blog.', error);
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.prisma.blog.update({
        where: { id },
        data: { active: false },
      });
    } catch (error) {
      throw new RepositoryException('Error deleting blog.', error);
    }
  }
}
