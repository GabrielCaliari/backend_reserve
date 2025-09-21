import RepositoryException from "src/core/exceptions/RepositoryException";
import prismaClient from "src/core/database/prisma/prismaClient";

export interface ICreateJournal {
    name: string;
    extension: string;
    size: string;
}

export default class JournalRepository {
    async create(data: ICreateJournal) {
        try {
            const raw = await prismaClient.journal.create({
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
            const raw = await prismaClient.journal.findUnique({
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