import { PrismaClient } from "@/generated/prisma/client";
import { EBrandMonitoring } from '@/modules/zarp-brands/domain/enums/brand-monitoring-status.enum';
import { EStatus } from '@/modules/zarp-auth/domain/enums/plan-status.enum';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { RepositoryException } from '@/shared/exceptions';
import { IBrandRepository, IBrandFields, IBrandInclude } from '@/modules/zarp-brands/domain/interfaces';

export { IBrandFields, IBrandInclude };

@Injectable()
export default class BrandRepository implements IBrandRepository {
    constructor(private readonly prisma: PrismaService) {}
    async create(data: Omit<IBrandFields, 'id'>, rx?: PrismaClient) {
        try {
            const connection = rx ?? this.prisma;

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
            const raws = await this.prisma.brand.findMany({
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
            const raw = await this.prisma.brand.findUnique({
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
            const raw = await this.prisma.brand.findFirst({
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