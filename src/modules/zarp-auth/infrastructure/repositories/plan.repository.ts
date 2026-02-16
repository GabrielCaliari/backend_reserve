import { PrismaClient } from "@/generated/prisma/client";
import { EStatus } from "@/@types/@plan";
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { RepositoryException } from '@/shared/exceptions';

@Injectable()
export default class PlanRepository {
    constructor(private readonly prisma: PrismaService) {}
    async linkMonitoringPlanWithBrand(monitoringPlanId: number, brandId: number, tx: PrismaClient) {
        try {
            const cc = tx ?? this.prisma;

            const raws = await cc.monitoringPlan.update({
                data: {
                    brand_id: brandId
                },
                where: {
                    id: monitoringPlanId,
                    status: EStatus.active
                }
            });

            return raws;
        } catch (error) {
            throw new RepositoryException('Erro ao criar um plano de monitoramento', error);
        }
    }

    async countMonitoringPlans(userId: number) {
        try {
            const countUsed = await this.prisma.monitoringPlan.count({
                where: {
                    status: EStatus.active,
                    user_id: userId,
                    brand_id: {
                        not: null
                    }
                }
            });

            const countNotUsed = await this.prisma.monitoringPlan.count({
                where: {
                    status: EStatus.active,
                    user_id: userId,
                    brand_id: null
                }
            });

            return {
                used: countUsed,
                not_used: countNotUsed
            }
        } catch (error) {
            throw new RepositoryException('Erro ao contar o nÃºmero de monitoramentos disponÃ­veis', error);
        }
    }

    async selectBySlug(slug: string) {
        try {
            const raw = await this.prisma.plan.findFirst({
                where: {
                    slug: slug,
                }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao buscar um plano de monitoramento pelo slug', error);
        }
    }

    async selectActiveByBrandId(brandId: number) {
        try {
            const raw = await this.prisma.monitoringPlan.findFirst({
                where: {
                    brand_id: brandId,
                    status: EStatus.active
                }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao buscar um plano de monitoramento pelo ID da marca', error);
        }
    }

    async selectAvailableMonitoringPlanByUser(userId: number) {
        try {
            const raws = await this.prisma.monitoringPlan.findMany({
                where: {
                    user_id: userId,
                    status: EStatus.active,
                    brand_id: null
                }
            });

            return raws;
        } catch (error) {
            throw new RepositoryException('Erro ao selecionar os planos de monitoramento por usuÃ¡rio.', error);
        }
    }
}