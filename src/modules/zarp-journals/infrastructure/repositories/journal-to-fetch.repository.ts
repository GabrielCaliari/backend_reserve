import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { IJournalToFetchRepository, ICreateJournalToFetch } from '../../domain/interfaces';

export { ICreateJournalToFetch };

@Injectable()
export default class JournalToFetchRepository implements IJournalToFetchRepository {
    constructor(private readonly prisma: PrismaService) {}
    async create(data: ICreateJournalToFetch) {
        try {
            const raw = await this.prisma.journalToFetch.create({
                data
            });

            return {
                id: raw.id
            }
        } catch (error) {
            throw new RepositoryException('Erro ao criar um novo journal to fetch.', error);
        }
    }

    async findByName(name: string) {
        try {
            const raw = await this.prisma.journalToFetch.findUnique({
                where: {
                    zip_name: name
                }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao buscar um journal to fetch pelo nome.', error);
        }
    }

    async findFirstNotSearchedXML() {
        try {
            const raw = await this.prisma.journalToFetch.findFirst({
                where: {
                    name: {
                        endsWith: '.xml'
                    },
                    searched: false
                }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao buscar um journal to fetch.', error);
        }
    }

    async findAllNotSearchedXML(limit = 30) {
        try {
            const raws = await this.prisma.journalToFetch.findMany({
                where: {
                    name: {
                        endsWith: '.xml'
                    },
                    searched: false
                },
                orderBy: {
                    zip_name: 'desc'
                },
                take: limit
            });

            return raws;
        } catch (error) {
            throw new RepositoryException('Erro ao buscar todos os journals to fetch.', error);
        }
    }
}