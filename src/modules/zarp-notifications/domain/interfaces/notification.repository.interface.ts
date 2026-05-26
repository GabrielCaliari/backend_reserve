import { ENotificationType, ENotificationScope } from '../enums';

export interface ICreateNotification {
  title: string;
  body: string;
  type: ENotificationType;
  scope: ENotificationScope;
  tenant_ids?: string[];
  event_key?: string;
  metadata?: Record<string, any>;
  send_email?: boolean;
  scheduled_at?: Date;
  created_by?: string;
}

export interface IUpdateNotification {
  title?: string;
  body?: string;
  scope?: ENotificationScope;
  tenant_ids?: string[];
  send_email?: boolean;
  scheduled_at?: Date;
}

export interface IListNotificationsFilter {
  type?: ENotificationType;
  scope?: ENotificationScope;
  published?: boolean;
  page?: number;
  limit?: number;
}

export const NOTIFICATION_REPOSITORY = 'NOTIFICATION_REPOSITORY';

export interface INotificationRepository {
  create(data: ICreateNotification): Promise<any>;
  findById(id: string): Promise<any | null>;
  findAll(filter: IListNotificationsFilter): Promise<{ data: any[]; total: number }>;
  update(id: string, data: IUpdateNotification): Promise<any>;
  publish(id: string): Promise<any>;
  delete(id: string): Promise<void>;
  findActiveForTenant(tenantId: string): Promise<any[]>;
  findAllActiveTenantIds(): Promise<string[]>;
}
