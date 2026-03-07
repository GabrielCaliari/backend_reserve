export interface IPlanRepository {
    linkMonitoringPlanWithBrand(monitoringPlanId: string, brandId: string, tx?: any): Promise<any>;
    countMonitoringPlans(userId: string): Promise<{ used: number; not_used: number }>;
    selectBySlug(slug: string): Promise<any>;
    selectActiveByBrandId(brandId: string): Promise<any>;
    selectAvailableMonitoringPlanByUser(userId: string): Promise<any[]>;
}

export const PLAN_REPOSITORY = Symbol('PLAN_REPOSITORY');
