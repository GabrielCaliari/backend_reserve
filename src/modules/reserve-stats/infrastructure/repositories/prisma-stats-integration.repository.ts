import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import {
  IStatsIntegration,
  IStatsIntegrationRepository,
} from '../../domain/interfaces/stats-integration.repository.interface';
import { StatsIntegration as PrismaStatsIntegration } from '../../../../generated/prisma/client';

@Injectable()
export class PrismaStatsIntegrationRepository implements IStatsIntegrationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenant(tenantId: string): Promise<IStatsIntegration[]> {
    try {
      const records = await this.prisma.statsIntegration.findMany({
        where: { tenant_id: tenantId },
        orderBy: { created_at: 'asc' },
      });
      return records.map((r) => this.toDomain(r));
    } catch (error) {
      throw new RepositoryException('Erro ao listar integrações de stats', error);
    }
  }

  async findByTenantAndKey(
    tenantId: string,
    key: string,
  ): Promise<IStatsIntegration | null> {
    try {
      const record = await this.prisma.statsIntegration.findUnique({
        where: { tenant_id_key: { tenant_id: tenantId, key } },
      });
      return record ? this.toDomain(record) : null;
    } catch (error) {
      throw new RepositoryException('Erro ao buscar integração de stats', error);
    }
  }

  async findById(id: string): Promise<IStatsIntegration | null> {
    try {
      const record = await this.prisma.statsIntegration.findUnique({
        where: { id },
      });
      return record ? this.toDomain(record) : null;
    } catch (error) {
      throw new RepositoryException('Erro ao buscar integração de stats', error);
    }
  }

  async create(
    data: Omit<IStatsIntegration, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<IStatsIntegration> {
    try {
      const record = await this.prisma.statsIntegration.create({
        data: {
          tenant_id: data.tenant_id,
          key: data.key,
          label: data.label,
          config: data.config,
          active: data.active,
        },
      });
      return this.toDomain(record);
    } catch (error) {
      throw new RepositoryException('Erro ao criar integração de stats', error);
    }
  }

  async update(
    id: string,
    data: Partial<
      Omit<IStatsIntegration, 'id' | 'tenant_id' | 'key' | 'created_at' | 'updated_at'>
    >,
  ): Promise<IStatsIntegration> {
    try {
      const record = await this.prisma.statsIntegration.update({
        where: { id },
        data: {
          ...(data.label !== undefined ? { label: data.label } : {}),
          ...(data.config !== undefined ? { config: data.config } : {}),
          ...(data.active !== undefined ? { active: data.active } : {}),
        },
      });
      return this.toDomain(record);
    } catch (error) {
      throw new RepositoryException('Erro ao atualizar integração de stats', error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.statsIntegration.delete({ where: { id } });
    } catch (error) {
      throw new RepositoryException('Erro ao deletar integração de stats', error);
    }
  }

  private toDomain(raw: PrismaStatsIntegration): IStatsIntegration {
    return {
      id: raw.id,
      tenant_id: raw.tenant_id,
      key: raw.key,
      label: raw.label,
      config: (raw.config as Record<string, any>) ?? {},
      active: raw.active,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
    };
  }
}
