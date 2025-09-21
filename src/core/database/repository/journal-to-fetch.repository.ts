import RepositoryException from "src/core/exceptions/RepositoryException";
import prismaClient from "src/core/database/prisma/prismaClient";

export interface ICreateJournalToFetch {
    zip_name: string;
    name: string;
}

export default class JournalToFetchRepository {
    async create(data: ICreateJournalToFetch) {
        try {
            const raw = await prismaClient.journalToFetch.create({
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
            const raw = await prismaClient.journalToFetch.findUnique({
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
            const raw = await prismaClient.journalToFetch.findFirst({
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
            const raws = await prismaClient.journalToFetch.findMany({
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