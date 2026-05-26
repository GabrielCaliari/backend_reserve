import { INotificationRepository, ICreateNotification, IUpdateNotification, IListNotificationsFilter } from '../../../modules/reserve-notifications/domain/interfaces';

export class InMemoryNotificationRepository implements INotificationRepository {
  private records: any[] = [];
  private idCounter = 1;

  async create(data: ICreateNotification): Promise<any> {
    const record = {
      id: String(this.idCounter++),
      ...data,
      tenant_ids: data.tenant_ids ?? [],
      published_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.records.push(record);
    return { ...record };
  }

  async findById(id: string): Promise<any | null> {
    return this.records.find(r => r.id === id) ?? null;
  }

  async findAll(filter: IListNotificationsFilter): Promise<{ data: any[]; total: number }> {
    let results = [...this.records];
    if (filter.type) results = results.filter(r => r.type === filter.type);
    if (filter.scope) results = results.filter(r => r.scope === filter.scope);
    if (filter.published === true) results = results.filter(r => r.published_at !== null);
    if (filter.published === false) results = results.filter(r => r.published_at === null);
    const total = results.length;
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const data = results.slice((page - 1) * limit, page * limit);
    return { data, total };
  }

  async update(id: string, data: IUpdateNotification): Promise<any> {
    const record = this.records.find(r => r.id === id);
    if (!record) throw new Error('Notification not found');
    Object.assign(record, data, { updated_at: new Date() });
    return { ...record };
  }

  async publish(id: string): Promise<any> {
    const record = this.records.find(r => r.id === id);
    if (!record) throw new Error('Notification not found');
    record.published_at = new Date();
    record.updated_at = new Date();
    return { ...record };
  }

  async delete(id: string): Promise<void> {
    this.records = this.records.filter(r => r.id !== id);
  }

  async findActiveForTenant(tenantId: string): Promise<any[]> {
    return this.records.filter(r =>
      r.published_at && (r.scope === 'broadcast' || r.tenant_ids.includes(tenantId))
    );
  }

  async findAllActiveTenantIds(): Promise<string[]> {
    return [];
  }

  seed(data: any): void {
    this.records.push({ id: String(this.idCounter++), created_at: new Date(), updated_at: new Date(), ...data });
  }

  clear(): void {
    this.records = [];
    this.idCounter = 1;
  }
}
