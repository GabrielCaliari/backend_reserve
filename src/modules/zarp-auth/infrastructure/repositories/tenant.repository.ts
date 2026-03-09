import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import {
  ITenantRepository,
  ICreateTenant,
  IUpdateTenant,
} from '../../domain/interfaces/tenant.repository.interface';

@Injectable()
export default class TenantRepository implements ITenantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: ICreateTenant) {
    try {
      return await this.prisma.tenant.create({
        data: {
          name: data.name,
          slug: data.slug,
          domain: data.domain ?? null,
        },
      });
    } catch (error) {
      throw new RepositoryException('Erro ao criar tenant.', error);
    }
  }

  async selectById(id: string) {
    try {
      return await this.prisma.tenant.findUnique({
        where: { id },
        include: { AdminTenant: { include: { Admin: true } } },
      });
    } catch (error) {
      throw new RepositoryException('Erro ao buscar tenant por ID.', error);
    }
  }

  async selectBySlug(slug: string) {
    try {
      return await this.prisma.tenant.findUnique({
        where: { slug },
      });
    } catch (error) {
      throw new RepositoryException('Erro ao buscar tenant por slug.', error);
    }
  }

  async selectAll() {
    try {
      return await this.prisma.tenant.findMany({
        include: {
          AdminTenant: {
            include: { Admin: { select: { id: true, name: true, email: true, role: true } } },
          },
        },
        orderBy: { created_at: 'desc' },
      });
    } catch (error) {
      throw new RepositoryException('Erro ao listar tenants.', error);
    }
  }

  async update(id: string, data: IUpdateTenant) {
    try {
      return await this.prisma.tenant.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw new RepositoryException('Erro ao atualizar tenant.', error);
    }
  }

  async deactivate(id: string) {
    try {
      return await this.prisma.tenant.update({
        where: { id },
        data: { active: false },
      });
    } catch (error) {
      throw new RepositoryException('Erro ao desativar tenant.', error);
    }
  }

  async activate(id: string) {
    try {
      return await this.prisma.tenant.update({
        where: { id },
        data: { active: true },
      });
    } catch (error) {
      throw new RepositoryException('Erro ao ativar tenant.', error);
    }
  }

  async scheduleDeletion(
    id: string,
    data: Pick<
      IUpdateTenant,
      | 'archived_at'
      | 'deletion_requested_at'
      | 'deletion_scheduled_for_at'
      | 'deletion_requested_by'
      | 'deletion_reason'
    >,
  ) {
    try {
      return await this.prisma.tenant.update({
        where: { id },
        data: {
          active: false,
          archived_at: data.archived_at ?? new Date(),
          deletion_requested_at: data.deletion_requested_at ?? new Date(),
          deletion_scheduled_for_at: data.deletion_scheduled_for_at ?? null,
          deletion_requested_by: data.deletion_requested_by ?? null,
          deletion_reason: data.deletion_reason ?? null,
        },
      });
    } catch (error) {
      throw new RepositoryException('Erro ao agendar exclusao do tenant.', error);
    }
  }

  async restoreDeletion(id: string) {
    try {
      return await this.prisma.tenant.update({
        where: { id },
        data: {
          active: true,
          archived_at: null,
          deletion_requested_at: null,
          deletion_scheduled_for_at: null,
          deletion_requested_by: null,
          deletion_reason: null,
        },
      });
    } catch (error) {
      throw new RepositoryException('Erro ao restaurar tenant agendado para exclusao.', error);
    }
  }

  async findDueForDeletion(now: Date) {
    try {
      return await this.prisma.tenant.findMany({
        where: {
          deletion_scheduled_for_at: {
            lte: now,
          },
        },
        orderBy: { deletion_scheduled_for_at: 'asc' },
      });
    } catch (error) {
      throw new RepositoryException('Erro ao listar tenants com exclusao vencida.', error);
    }
  }

  async delete(id: string) {
    try {
      await this.prisma.$transaction(async (tx) => {
        const [blogs, leadCollections, mediaAssets, mediaCollections] = await Promise.all([
          tx.blog.findMany({ where: { tenant_id: id }, select: { id: true } }),
          tx.leadCollection.findMany({ where: { tenant_id: id }, select: { id: true } }),
          tx.mediaAsset.findMany({ where: { tenant_id: id }, select: { id: true } }),
          tx.mediaCollection.findMany({ where: { tenant_id: id }, select: { id: true } }),
        ]);

        const blogIds = blogs.map((blog) => blog.id);
        const leadCollectionIds = leadCollections.map((collection) => collection.id);
        const mediaAssetIds = mediaAssets.map((asset) => asset.id);
        const mediaCollectionIds = mediaCollections.map((collection) => collection.id);

        await tx.adminTenant.deleteMany({ where: { tenant_id: id } });
        await tx.statsIntegration.deleteMany({ where: { tenant_id: id } });

        if (mediaAssetIds.length > 0) {
          await tx.mediaAssetRelation.deleteMany({
            where: {
              asset_id: { in: mediaAssetIds },
            },
          });
        }

        await tx.lead.deleteMany({ where: { tenant_id: id } });

        if (leadCollectionIds.length > 0) {
          await tx.leadCollection.deleteMany({
            where: {
              id: { in: leadCollectionIds },
            },
          });
        }

        if (blogIds.length > 0) {
          await tx.article.deleteMany({
            where: {
              blog_id: { in: blogIds },
            },
          });
        }

        await tx.author.deleteMany({ where: { tenant_id: id } });
        await tx.blog.deleteMany({ where: { tenant_id: id } });
        await tx.userCollection.deleteMany({ where: { tenant_id: id } });

        if (mediaAssetIds.length > 0) {
          await tx.mediaAsset.deleteMany({
            where: {
              id: { in: mediaAssetIds },
            },
          });
        }

        if (mediaCollectionIds.length > 0) {
          await tx.mediaCollection.deleteMany({
            where: {
              id: { in: mediaCollectionIds },
            },
          });
        }

        await tx.tenant.delete({
          where: { id },
        });
      });
    } catch (error) {
      throw new RepositoryException('Erro ao deletar tenant.', error);
    }
  }
}
