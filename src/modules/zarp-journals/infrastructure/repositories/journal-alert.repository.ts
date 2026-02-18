import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { IJournalAlertRepository } from '../../domain/interfaces';

@Injectable()
export default class JournalAlertRepository implements IJournalAlertRepository {
    constructor(private readonly prisma: PrismaService) {}
    async findByBrandName(name: string, lastMagazine: string | null = null, contains = false, { select, pag, order, unique }: { select?, order?: {}, pag?: { page?, limit, offset?}, unique?: boolean } = {}) {
        try {
            const raws = await this.prisma.journalAlert.findMany({
                ...(unique ? { distinct: ['process_number'] } : {}),
                ...(select ? { select } : {}),
                where: {
                    brand: {
                        ...(contains ? {
                            startsWith: name // TODO: Corrigir essa busca, sÃ³ tÃ¡ procurando por LIKE "TEXTO%" ao INVÃˆS DE "%TEXTO%" POR CONTA DA FORMA QUE O INDEX SE COMPORTA
                        } : {
                            equals: name
                        }),
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
            const raws = await this.prisma.journalAlert.count({
                where: where,
            });

            return raws;
        } catch (error) {
            throw new RepositoryException('Erro ao contar os alertas do jornal.', error);
        }
    }
}