export class ScheduleConfigNotFoundError extends Error {
  constructor(tenantId: string) {
    super(`Schedule configuration not found for tenant: ${tenantId}`);
    this.name = 'ScheduleConfigNotFoundError';
  }
}
