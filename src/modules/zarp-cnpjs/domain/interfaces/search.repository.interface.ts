export interface ISearchCreate {
    amount: number;
    filters: string;
    limit: number;
    user_id: string;
}

export interface ISearchRepository {
    findByHash(hash: string): Promise<any>;
    create(data: ISearchCreate): Promise<any>;
    countUserMonth(userId: string): Promise<number>;
    count(userId: string): Promise<number>;
}

export const SEARCH_REPOSITORY = Symbol('SEARCH_REPOSITORY');
