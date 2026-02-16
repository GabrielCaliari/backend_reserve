import { PrismaClient } from "src/generated/prisma/client";
import { EStatus } from "src/@types/@plan";
import RepositoryException from "src/core/exceptions/RepositoryException";
import prismaClient from "src/core/database/prisma/prismaClient";

export default class PlanRepository {
    async linkMonitoringPlanWithBrand(monitoringPlanId: number, brandId: number, tx: PrismaClient) {
        try {
            const cc = tx ?? prismaClient;

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
            const countUsed = await prismaClient.monitoringPlan.count({
                where: {
                    status: EStatus.active,
                    user_id: userId,
                    brand_id: {
                        not: null
                    }
                }
            });

            const countNotUsed = await prismaClient.monitoringPlan.count({
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
            throw new RepositoryException('Erro ao contar o número de monitoramentos disponíveis', error);
        }
    }

    async selectBySlug(slug: string) {
        try {
            const raw = await prismaClient.plan.findFirst({
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
            const raw = await prismaClient.monitoringPlan.findFirst({
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
            const raws = await prismaClient.monitoringPlan.findMany({
                where: {
                    user_id: userId,
                    status: EStatus.active,
                    brand_id: null
                }
            });

            return raws;
        } catch (error) {
            throw new RepositoryException('Erro ao selecionar os planos de monitoramento por usuário.', error);
        }
    }
}