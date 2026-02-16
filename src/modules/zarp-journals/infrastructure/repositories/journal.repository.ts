import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { RepositoryException } from '@/shared/exceptions';

export interface ICreateJournal {
    name: string;
    extension: string;
    size: string;
}

@Injectable()
export default class JournalRepository {
    constructor(private readonly prisma: PrismaService) {}
    async create(data: ICreateJournal) {
        try {
            const raw = await this.prisma.journal.create({
                data
            });

            return {
                id: raw.id
            }
        } catch (error) {
            throw new RepositoryException('Erro ao criar um novo journal.', error);
        }
    }

    async findByName(name: string) {
        try {
            const raw = await this.prisma.journal.findUnique({
                where: {
                    name
                }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao buscar um journal pelo nome.', error);
        }
    }
}