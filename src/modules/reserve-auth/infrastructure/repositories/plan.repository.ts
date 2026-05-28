import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { IPlanRepository } from '../../domain/interfaces';

@Injectable()
export default class PlanRepository implements IPlanRepository {
    constructor(private readonly prisma: PrismaService) {}

    async selectBySlug(slug: string) {
        try {
            return await this.prisma.plan.findFirst({ where: { slug } });
        } catch (error) {
            throw new RepositoryException('Erro ao buscar plano pelo slug', error);
        }
    }
}
