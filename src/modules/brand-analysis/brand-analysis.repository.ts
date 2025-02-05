import { PrismaClient } from "@prisma/client";
import RepositoryException from "src/core/exceptions/RepositoryException";
import prismaClient from "src/core/prisma/prismaClient";

export interface IBrandAnalysis {
    html_data_response: object;
    json_data_response: object;
    md_data_reposnse: object;
    response: object;
    user_message: object;
    brand: string;
    niche: string;
    description: string;
    user_id: number;
}

export interface IBrandAnalysisRequest {
    valid: boolean;
    brand_analysis_id?: number;
    user_id: number;
}

export default class BrandAnalysisRepository {
    async create(data: IBrandAnalysis, tx?: PrismaClient) {
        try {
            const conn = tx ? tx : prismaClient;

            const raw = await conn.brandAnalysis.create({
                data: {
                    html_data_response: data.html_data_response,
                    json_data_response: data.json_data_response,
                    md_data_reposnse: data.md_data_reposnse,
                    response: data.response,
                    user_message: data.user_message,
                    brand: data.brand,
                    description: data.description,
                    user_id: data.user_id,
                    niche: data.niche,
                }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao criar uma nova analise de marca.', error);
        }
    }

    async brandAnalysisRequestCreate(data: IBrandAnalysisRequest, tx?: PrismaClient) {
        try {
            const conn = tx ? tx : prismaClient;

            const raw = await conn.brandAnalysisRequest.create({
                data: {
                    valid: data.valid,
                    ...(data.brand_analysis_id ? { brand_analysis_id: data.brand_analysis_id } : {}),
                    user_id: data.user_id
                }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao criar uma nova solicitação de analise de marca.', error);
        }
    }

    async invalidateBrandAnalysisRequest(id: number, tx?: PrismaClient) {
        try {
            const conn = tx ? tx : prismaClient;

            return await conn.brandAnalysisRequest.update({
                data: {
                    valid: false
                },
                where: {
                    id
                }
            })
        } catch (error) {
            throw new RepositoryException('Erro ao criar invalidar uma nova solicitação de analise de marca.', error);
        }
    }

    async validateBrandAnalysisRequest(id: number, brandAnalysisId: number, tx?: PrismaClient) {
        try {
            const conn = tx ? tx : prismaClient;

            return await conn.brandAnalysisRequest.update({
                data: {
                    valid: true,
                    brand_analysis_id: brandAnalysisId
                },
                where: {
                    id
                }
            })
        } catch (error) {
            throw new RepositoryException('Erro ao criar validar uma nova solicitação de analise de marca.', error);
        }
    }

    async countBrandAnalysisRequestMonth(userId: number, valid: boolean = true) {
        try {
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

            const raw = await prismaClient.brandAnalysisRequest.count({
                where: {
                    user_id: userId,
                    valid: valid,
                    created_at: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao contar solicitaçõs de analise de marca.', error);
        }
    }

    async selectByUser(userId: number) {
        try {
            const raws = await prismaClient.brandAnalysis.findMany({
                where: {
                    user_id: userId
                }
            });

            return raws;
        } catch (error) {
            throw new RepositoryException('Erro ao selecionar um usuário da marca.', error);
        }
    }

    async selectByUserAndId(id: number, userId: number) {
        try {
            const raw = await prismaClient.brandAnalysis.findUnique({
                where: {
                    id,
                    user_id: userId
                }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao selecionar uma marca e um usuário.', error);
        }
    }

    async countBrandAnalysisMonth(userId: number) {
        try {
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

            const raw = await prismaClient.brandAnalysis.count({
                where: {
                    user_id: userId,
                    created_at: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao contar o número de análise de marcas por usuário.', error);
        }
    }
}