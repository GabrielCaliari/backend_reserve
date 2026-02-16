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

export interface IBrandAnalysisRepository {
    create(data: IBrandAnalysis, tx?: any): Promise<any>;
    brandAnalysisRequestCreate(data: IBrandAnalysisRequest, tx?: any): Promise<any>;
    invalidateBrandAnalysisRequest(id: number, tx?: any): Promise<any>;
    validateBrandAnalysisRequest(id: number, brandAnalysisId: number, tx?: any): Promise<any>;
    countBrandAnalysisRequestMonth(userId: number, valid?: boolean): Promise<number>;
    selectByUser(userId: number): Promise<any[]>;
    selectByUserAndId(id: number, userId: number): Promise<any>;
    countBrandAnalysisMonth(userId: number): Promise<number>;
    createBrandAnalysisTokens(tokens: IBrandAnalysisToken[]): Promise<any>;
    countBrandAnalysisTokens(userId: number, used?: boolean): Promise<number>;
    selectBrandAnalysisToken(userId: number, used?: boolean): Promise<any>;
    useBrandAnalyticsToken(brandAnalysiId: number, tokenId: number, tx?: any): Promise<any>;
}

export const BRAND_ANALYSIS_REPOSITORY = Symbol('BRAND_ANALYSIS_REPOSITORY');
