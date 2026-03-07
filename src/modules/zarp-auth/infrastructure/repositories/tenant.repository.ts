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

  async delete(id: string) {
    try {
      await this.prisma.tenant.delete({
        where: { id },
      });
    } catch (error) {
      throw new RepositoryException('Erro ao deletar tenant.', error);
    }
  }
}
