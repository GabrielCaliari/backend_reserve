export interface IAdditionalTokenPackRepository {
    selectPackBySlug(slug: string): Promise<any>;
}

export const ADDITIONAL_TOKEN_PACK_REPOSITORY = Symbol('ADDITIONAL_TOKEN_PACK_REPOSITORY');
