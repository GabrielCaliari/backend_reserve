import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { ISMTPServerRepository } from '../../domain/interfaces';

/**
 * Prisma implementation of SMTP Server Repository
 * Infrastructure layer - implements domain interface
 */
@Injectable()
export class PrismaSMTPServerRepository implements ISMTPServerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findDefault(): Promise<{ id: string; host: string; port: number; user: string; password: string } | null> {
    try {
      const result = await this.prisma.sMTPServer.findFirst({
        where: { default: true },
      });

      if (!result) return null;

      return {
        id: result.id,
        host: result.host,
        port: parseInt(result.port, 10),
        user: result.username,
        password: result.hash_password,
      };
    } catch (error) {
      throw new RepositoryException('Error finding default SMTP server', 'SMTP_SERVER_FIND_ERROR', error);
    }
  }

  async findById(id: string): Promise<{ id: string; host: string; port: number; user: string; password: string } | null> {
    try {
      const result = await this.prisma.sMTPServer.findUnique({
        where: { id },
      });

      if (!result) return null;

      return {
        id: result.id,
        host: result.host,
        port: parseInt(result.port, 10),
        user: result.username,
        password: result.hash_password,
      };
    } catch (error) {
      throw new RepositoryException('Error finding SMTP server by id', 'SMTP_SERVER_FIND_ERROR', error);
    }
  }
}
