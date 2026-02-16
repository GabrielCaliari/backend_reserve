import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { RepositoryException } from '@/shared/exceptions';
import { randomBytes } from 'crypto';
import { ISearchRepository, ISearchCreate } from '@/modules/zarp-cnpjs/domain/interfaces';

export { ISearchCreate };

@Injectable()
export default class SearchRepository implements ISearchRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findByHash(hash: string) {
        try {
            const raw = await this.prisma.search.findUnique({
                where: {
                    hash: hash
                }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao buscar uma pesquisa pelo hash.', error);
        }
    }

    async create(data: ISearchCreate) {
        try {
            const raw = await this.prisma.search.create({
                data: {
                    ...data,
                    hash: randomBytes(64).toString('hex').slice(0, 64)
                }
            });

            return raw
        } catch (error) {
            throw new RepositoryException('Erro ao criar uma pesquisa.', error);
        }
    }

    async countUserMonth(userId: number) {
        try {
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

            const raw = await this.prisma.search.count({
                where: {
                    user_id: userId,
                    created_at: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao contar o número de pesquisas por usuário.', error);
        }
    }

    async count(userId: number) {
        try {
            const count  = await this.prisma.search.count({
                where: {
                    user_id: userId
                }
            });

            return count;
        } catch (error) {
            throw new RepositoryException('Erro ao contar as pesquisas por usuário.', error);
        }
    }
}