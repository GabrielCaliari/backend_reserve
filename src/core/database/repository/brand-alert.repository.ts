import { PrismaClient } from "src/generated/prisma/client";
import { EBrandMonitoring } from "src/@types/@brand-monitoring";
import RepositoryException from "src/core/exceptions/RepositoryException";
import prismaClient from "src/core/database/prisma/prismaClient";

export interface IBrandAlert {
    brand?: string
    deposit_date?: Date
    conception_date?: Date
    effective_date?: Date
    nature?: string
    presentation?: string
    classe_nice?: object
    prioridade_unionista?: object
    apostila?: string
    classe_viena: object
    journal_number: string
    journal_date: Date
    process_number: string
    attorney?: string
    titular: object
    despacho: object
    sobrestador: object
    brand_id: number
    brand_monitoring_id: number
    user_id: number
    jornal_to_fetch_id: number
}

export default class BrandAlertRepository {
    async createMany(data: IBrandAlert[], tx?: PrismaClient) {
        try {
            const cc = tx ?? prismaClient;

            const raws = await cc.brandAlert.createMany({
                data
            });

            return raws;
        } catch (error) {
            throw new RepositoryException('Erro ao criar vários alerts brands', error);
        }
    }

    async findByBrand(brandId: number, limit?) {
        try {
            const raw = await prismaClient.brandAlert.findMany({
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

    async findLastMoves(userId: number, limit = 100) {
        try {
            const brands = await prismaClient.brandAlert.findMany({
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