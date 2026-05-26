import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { ICnaeRepository } from '../../domain/interfaces';

@Injectable()
export default class CnaeRepository implements ICnaeRepository {
    constructor(private readonly prisma: PrismaService) {}

    async find() {
        try {
            const raws = await this.prisma.cnae.findMany();
            return raws;
        } catch (error) {
            throw new RepositoryException('Erro ao buscar os cnaes.', error);
        }
    }
}