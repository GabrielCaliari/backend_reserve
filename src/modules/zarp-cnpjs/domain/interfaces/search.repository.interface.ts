export interface ISearchCreate {
    amount: number;
    filters: string;
    limit: number;
    user_id: number;
}

export interface ISearchRepository {
    findByHash(hash: string): Promise<any>;
    create(data: ISearchCreate): Promise<any>;
    countUserMonth(userId: number): Promise<number>;
    count(userId: number): Promise<number>;
}

export const SEARCH_REPOSITORY = Symbol('SEARCH_REPOSITORY');
