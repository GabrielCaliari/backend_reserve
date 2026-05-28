export interface IPlanRepository {
    selectBySlug(slug: string): Promise<any>;
}

export const PLAN_REPOSITORY = Symbol('PLAN_REPOSITORY');
