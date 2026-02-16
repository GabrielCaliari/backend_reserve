export interface IPlanRepository {
    linkMonitoringPlanWithBrand(monitoringPlanId: number, brandId: number, tx?: any): Promise<any>;
    countMonitoringPlans(userId: number): Promise<{ used: number; not_used: number }>;
    selectBySlug(slug: string): Promise<any>;
    selectActiveByBrandId(brandId: number): Promise<any>;
    selectAvailableMonitoringPlanByUser(userId: number): Promise<any[]>;
}

export const PLAN_REPOSITORY = Symbol('PLAN_REPOSITORY');
