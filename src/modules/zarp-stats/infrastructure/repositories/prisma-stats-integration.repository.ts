import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import {
  IStatsIntegration,
  IStatsIntegrationRepository,
} from '../../domain/interfaces/stats-integration.repository.interface';

@Injectable()
export class PrismaStatsIntegrationRepository implements IStatsIntegrationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenant(tenantId: number): Promise<IStatsIntegration[]> {
    try {
      return await this.prisma.statsIntegration.findMany({
        where: { tenant_id: tenantId },
        orderBy: { created_at: 'asc' },
      }) as unknown as IStatsIntegration[];
    } catch (error) {
      throw new RepositoryException('Erro ao listar integrações de stats', error);
    }
  }

  async findByTenantAndKey(
    tenantId: number,
    key: string,
  ): Promise<IStatsIntegration | null> {
    try {
      return await this.prisma.statsIntegration.findUnique({
        where: { tenant_id_key: { tenant_id: tenantId, key } },
      }) as unknown as IStatsIntegration | null;
    } catch (error) {
      throw new RepositoryException('Erro ao buscar integração de stats', error);
    }
  }

  async findById(id: number): Promise<IStatsIntegration | null> {
    try {
      return await this.prisma.statsIntegration.findUnique({
        where: { id },
      }) as unknown as IStatsIntegration | null;
    } catch (error) {
      throw new RepositoryException('Erro ao buscar integração de stats', error);
    }
  }

  async create(
    data: Omit<IStatsIntegration, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<IStatsIntegration> {
    try {
      return await this.prisma.statsIntegration.create({
        data: {
          tenant_id: data.tenant_id,
          key: data.key,
          label: data.label,
          config: data.config,
          active: data.active,
        },
      }) as unknown as IStatsIntegration;
    } catch (error) {
      throw new RepositoryException('Erro ao criar integração de stats', error);
    }
  }

  async update(
    id: number,
    data: Partial<
      Omit<IStatsIntegration, 'id' | 'tenant_id' | 'key' | 'created_at' | 'updated_at'>
    >,
  ): Promise<IStatsIntegration> {
    try {
      return await this.prisma.statsIntegration.update({
        where: { id },
        data: {
          ...(data.label !== undefined ? { label: data.label } : {}),
          ...(data.config !== undefined ? { config: data.config } : {}),
          ...(data.active !== undefined ? { active: data.active } : {}),
        },
      }) as unknown as IStatsIntegration;
    } catch (error) {
      throw new RepositoryException('Erro ao atualizar integração de stats', error);
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.prisma.statsIntegration.delete({ where: { id } });
    } catch (error) {
      throw new RepositoryException('Erro ao deletar integração de stats', error);
    }
  }
}
