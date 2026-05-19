import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import {
  IActivationTokenRepository,
  ICreateActivationToken,
  IActivationToken,
} from '../../domain/interfaces/activation-token.repository.interface';
import { ETokenType } from '../../domain/enums/token-type.enum';

@Injectable()
export class PrismaActivationTokenRepository implements IActivationTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: ICreateActivationToken): Promise<IActivationToken> {
    try {
      return await this.prisma.activationToken.create({ data });
    } catch (error) {
      throw new RepositoryException('Erro ao criar ActivationToken.', error);
    }
  }

  async findByToken(token: string): Promise<IActivationToken | null> {
    try {
      return await this.prisma.activationToken.findUnique({ where: { token } });
    } catch (error) {
      throw new RepositoryException('Erro ao buscar ActivationToken.', error);
    }
  }

  async findActivePending(customerId: string, tenantId: string, type: ETokenType): Promise<IActivationToken | null> {
    try {
      return await this.prisma.activationToken.findFirst({
        where: {
          customer_id: customerId,
          tenant_id: tenantId,
          type,
          used_at: null,
          expires_at: { gt: new Date() },
        },
        orderBy: { created_at: 'desc' },
      });
    } catch (error) {
      throw new RepositoryException('Erro ao buscar ActivationToken ativo.', error);
    }
  }

  async markAsUsed(id: string): Promise<void> {
    try {
      await this.prisma.activationToken.update({
        where: { id },
        data: { used_at: new Date() },
      });
    } catch (error) {
      throw new RepositoryException('Erro ao marcar ActivationToken como usado.', error);
    }
  }
}
