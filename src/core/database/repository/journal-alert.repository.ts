import RepositoryException from "src/core/exceptions/RepositoryException";
import prismaClient from "src/core/prisma/prismaClient";

export default class JournalAlertRepository {
    async findByBrandName(name: string, lastMagazine: string | null = null, contains = false, { select, pag, order, unique }: { select?, order?: {}, pag?: { page?, limit, offset?}, unique?: boolean } = {}) {
        try {
            const raws = await prismaClient.journalAlert.findMany({
                ...(unique ? { distinct: ['process_number'] } : {}),
                ...(select ? { select } : {}),
                where: {
                    brand: {
                        ...(contains ? {
                            contains: name
                        } : {
                            equals: name
                        }),
                        mode: 'insensitive'
                    },
                    ...(lastMagazine ? { journal_number: { gt: lastMagazine } } : {}),
                },
                ...(pag && pag.page && !pag.offset ? { skip: (pag.page - 1) * pag.limit } : {}),
                ...(pag && pag.offset && !pag.page ? { skip: pag.offset } : {}),
                ...(pag && pag.limit ? { take: pag.limit } : {}),
                ...(order ? { orderBy: order } : {
                    orderBy: {
                        journal_number: 'asc'
                    }
                })

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