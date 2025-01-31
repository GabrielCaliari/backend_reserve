import { PrismaClient } from "@prisma/client";
import { EBrandMonitoring } from "src/@types/@brand-monitoring";
import { EStatus } from "src/@types/@plan";
import RepositoryException from "src/core/exceptions/RepositoryException";
import prismaClient from "src/core/prisma/prismaClient";

export interface IBrandFields {
    id?: number;
    name: string;
    identifier?: string;
    email: string;
    phone_number: string;
    inpi_number?: string;
    user_id: number;
}

export interface IBrandInclude {
    BrandAlert: boolean;
}

export default class BrandRepository {
    async create(data: Omit<IBrandFields, 'id'>, rx?: PrismaClient) {
        try {
            const connection = rx ?? prismaClient;

            const raw = await connection.brand.create({
                data: {
                    email: data.email,
                    name: data.name,
                    phone_number: data.phone_number,
                    identifier: data.identifier,
                    inpi_number: data.inpi_number,
                    user_id: data.user_id,
                }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao criar uma nova marca.', error);
        }
    }

    async find(
        where = {},
        {
            pag = {
                page: 1,
                limit: 30
            },
            include = {
                MonitoringPlan: false
            }
        }: {
            pag?: { page: number, limit: number },
            include?: {
                MonitoringPlan?: boolean;
                BrandMonitoring?: boolean;
            }
        }
    ) {
        try {
            const raws = await prismaClient.brand.findMany({
                where,
                skip: (pag.page - 1) * pag.limit,
                take: pag.limit,
                include
            });

            return raws;
        } catch (error) {
            throw new RepositoryException('Erro ao selecionar uma nova marca.', error);
        }
    }

    async findById(brandId: number, include: IBrandInclude = {
        BrandAlert: false
    }) {
        try {
            const raw = await prismaClient.brand.findUnique({
                where: {
                    id: brandId
                },
                include
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao selecionar uma marca pelo nome.', error);
        }
    }

    async findByNameAndUser(name: string, userId: number) {
        try {
            const raw = await prismaClient.brand.findFirst({
                where: {
                    AND: [
                        {
                            name,
                        },
                        {
                            user_id: userId
                        }
                    ]
                }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao selecionar uma marca pelo nome.', error);
        }
    }
}