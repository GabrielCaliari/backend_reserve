export interface IBrandAnalysis {
    html_data_response: object;
    json_data_response: object;
    md_data_reposnse: object;
    response: object;
    user_message: object;
    brand: string;
    niche: string;
    description: string;
    user_id: string;
}

export interface IBrandAnalysisRequest {
    valid: boolean;
    brand_analysis_token_id: string;
    brand_analysis_id?: string;
    user_id: string;
}

export interface IBrandAnalysisToken {
    status: number;
    user_id: string;
}

export interface IBrandAnalysisRepository {
    create(data: IBrandAnalysis, tx?: any): Promise<any>;
    brandAnalysisRequestCreate(data: IBrandAnalysisRequest, tx?: any): Promise<any>;
    invalidateBrandAnalysisRequest(id: string, tx?: any): Promise<any>;
    validateBrandAnalysisRequest(id: string, brandAnalysisId: string, tx?: any): Promise<any>;
    countBrandAnalysisRequestMonth(userId: string, valid?: boolean): Promise<number>;
    selectByUser(userId: string): Promise<any[]>;
    selectByUserAndId(id: string, userId: string): Promise<any>;
    countBrandAnalysisMonth(userId: string): Promise<number>;
    createBrandAnalysisTokens(tokens: IBrandAnalysisToken[]): Promise<any>;
    countBrandAnalysisTokens(userId: string, used?: boolean): Promise<number>;
    selectBrandAnalysisToken(userId: string, used?: boolean): Promise<any>;
    useBrandAnalyticsToken(brandAnalysiId: string, tokenId: string, tx?: any): Promise<any>;
}

export const BRAND_ANALYSIS_REPOSITORY = Symbol('BRAND_ANALYSIS_REPOSITORY');
