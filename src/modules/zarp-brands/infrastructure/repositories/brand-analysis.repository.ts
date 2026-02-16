import { PrismaClient } from "@/generated/prisma/client";
import { EBrandAnalysisTokenStatus } from "@/@types/@brand-analysis-token";
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { RepositoryException } from '@/shared/exceptions';

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
    brand_analysis_token_id: number;
    brand_analysis_id?: number;
    user_id: number;
}

export interface IBrandAnalysisToken {
    status: number;
    user_id: number;
}

@Injectable()
export default class BrandAnalysisRepository {
    constructor(private readonly prisma: PrismaService) {}
    async create(data: IBrandAnalysis, tx?: PrismaClient) {
        try {
            const conn = tx ? tx : this.prisma;

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
            const conn = tx ? tx : this.prisma;

            const raw = await conn.brandAnalysisRequest.create({
                data: {
                    valid: data.valid,
                    brand_analysis_token_id: data.brand_analysis_token_id,
                    ...(data.brand_analysis_id ? { brand_analysis_id: data.brand_analysis_id } : {}),
                    user_id: data.user_id
                }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao criar uma nova solicitaÃ§Ã£o de analise de marca.', error);
        }
    }

    async invalidateBrandAnalysisRequest(id: number, tx?: PrismaClient) {
        try {
            const conn = tx ? tx : this.prisma;

            return await conn.brandAnalysisRequest.update({
                data: {
                    valid: false
                },
                where: {
                    id
                }
            })
        } catch (error) {
            throw new RepositoryException('Erro ao criar invalidar uma nova solicitaÃ§Ã£o de analise de marca.', error);
        }
    }

    async validateBrandAnalysisRequest(id: number, brandAnalysisId: number, tx?: PrismaClient) {
        try {
            const conn = tx ? tx : this.prisma;

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
            throw new RepositoryException('Erro ao criar validar uma nova solicitaÃ§Ã£o de analise de marca.', error);
        }
    }

    async countBrandAnalysisRequestMonth(userId: number, valid: boolean = true) {
        try {
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

            const raw = await this.prisma.brandAnalysisRequest.count({
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
            throw new RepositoryException('Erro ao contar solicitaÃ§Ãµs de analise de marca.', error);
        }
    }

    async selectByUser(userId: number) {
        try {
            const raws = await this.prisma.brandAnalysis.findMany({
                where: {
                    user_id: userId
                }
            });

            return raws;
        } catch (error) {
            throw new RepositoryException('Erro ao selecionar um usuÃ¡rio da marca.', error);
        }
    }

    async selectByUserAndId(id: number, userId: number) {
        try {
            const raw = await this.prisma.brandAnalysis.findUnique({
                where: {
                    id,
                    user_id: userId
                }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao selecionar uma marca e um usuÃ¡rio.', error);
        }
    }

    async countBrandAnalysisMonth(userId: number) {
        try {
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

            const raw = await this.prisma.brandAnalysis.count({
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
            throw new RepositoryException('Erro ao contar o nÃºmero de anÃ¡lise de marcas por usuÃ¡rio.', error);
        }
    }

    async createBrandAnalysisTokens(tokens: IBrandAnalysisToken[]) {
        try {
            const raws = await this.prisma.brandAnalysisToken.createManyAndReturn({
                data: tokens
            });

            return raws;
        } catch(error) {
            throw new RepositoryException('Erro ao criar tokens para um usuÃ¡rio.', error);
        }
    }

    async countBrandAnalysisTokens(userId: number, used?: boolean) {
        try {
            const count = await this.prisma.brandAnalysisToken.count({
                where: {
                    user_id: userId,
                    ...(
                        typeof used == 'boolean' ? {
                            brand_analysis_id: used ? { not: null } : null
                        } : {}
                    ),
                    status: EBrandAnalysisTokenStatus.active
                }
            });

            return count;
        } catch (error) {
            throw new RepositoryException('Erro ao contar o nÃºmero de token de anÃ¡lise de marcas por usuÃ¡rio.', error);
        }
    }

    async selectBrandAnalysisToken(userId: number, used: boolean = false) {
        try {
            const token = await this.prisma.brandAnalysisToken.findFirst({
                where: {
                    user_id: userId,
                    ...(
                        typeof used == 'boolean' ? {
                            brand_analysis_id: used ? { not: null } : null
                        } : {}
                    ),
                    status: EBrandAnalysisTokenStatus.active
                }
            });

            return token;
        } catch (error) {
            throw new RepositoryException('Erro ao selecionar um token de anÃ¡lise de marcas do usuÃ¡rio.', error);
        }
    }

    async useBrandAnalyticsToken(brandAnalysiId: number, tokenId: number, tx?: PrismaClient) {
        try {
            const conn = tx ? tx : this.prisma;

            const updated = await conn.brandAnalysisToken.update({
                where: {
                    id: tokenId
                },
                data: {
                    brand_analysis_id: brandAnalysiId
                }
            });

            return updated;
        } catch (error) {
            throw new RepositoryException('Erro ao atualizar um token de anÃ¡lise de marcas do usuÃ¡rio.', error);
        }
    }
}