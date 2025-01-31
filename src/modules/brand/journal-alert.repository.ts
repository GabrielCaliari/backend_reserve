import RepositoryException from "src/core/exceptions/RepositoryException";
import prismaClient from "src/core/prisma/prismaClient";

export default class JournalAlertRepository {
    async findByBrandName(name: string, lastMagazine: string | null = null) {
        try {
            const raws = await prismaClient.journalAlert.findMany({
                where: {
                    brand: {
                        equals: name,
                        mode: 'insensitive'
                    },
                    ...(lastMagazine ? { journal_number: { gt: lastMagazine } } : {})
                },
                orderBy: {
                    journal_number: 'asc'
                }
            });

            return raws;
        } catch (error) {
            throw new RepositoryException('Erro ao selecionar um alerta no jornal.', error);
        }
    }

    async count(where: {}) {
        try {
            const raws = await prismaClient.journalAlert.count({
                where: where,
            });

            return raws;
        } catch (error) {
            throw new RepositoryException('Erro ao contar os alertas do jornal.', error);
        }
    }
}