import { PrismaClient } from "../../../../generated/prisma/client";
import { EBrandMonitoring } from '../../domain/enums/brand-monitoring-status.enum';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { IBrandAlertRepository, IBrandAlert } from '../../domain/interfaces';

export { IBrandAlert };

@Injectable()
export default class BrandAlertRepository implements IBrandAlertRepository {
    constructor(private readonly prisma: PrismaService) {}
    async createMany(data: IBrandAlert[], tx?: PrismaClient) {
        try {
            const cc = tx ?? this.prisma;

            const raws = await cc.brandAlert.createMany({
                data
            });

            return raws;
        } catch (error) {
            throw new RepositoryException('Erro ao criar vÃ¡rios alerts brands', error);
        }
    }

    async findByBrand(brandId: string, limit?) {
        try {
            const raw = await this.prisma.brandAlert.findMany({
                where: {
                    brand_id: brandId
                },
                ...(limit ? { take: limit } : {}),
                orderBy: {
                    journal_number: 'desc'
                }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao buscar brands alerts de uma marca especifica', error);
        }
    }

    async findLastMoves(userId: string, limit = 100) {
        try {
            const brands = await this.prisma.brandAlert.findMany({
                where: {
                    user_id: userId,
                    BrandMonitoring: {
                        status: {
                            not: EBrandMonitoring.inactive
                        }
                    }
                },
                take: limit,
                orderBy: {
                    journal_number: 'desc'
                }
            });

            return brands;
        } catch (error) {
            throw new RepositoryException('Erro ao selecionar uma nova marca.', error);
        }
    }
}