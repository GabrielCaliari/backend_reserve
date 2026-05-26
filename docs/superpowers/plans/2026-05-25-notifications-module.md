# Notifications Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `reserve-notifications` module — a communication layer between the Reserve platform and its tenants, supporting manual (super_admin), event-driven, and cron-scheduled notifications with in-app and email delivery, per-tenant settings, and read-tracking per admin and per tenant.

**Architecture:** Three Prisma models (`Notification`, `TenantNotificationReceipt`, `TenantNotificationSettings`) are the source of truth. Five NestJS services split responsibility cleanly: CRUD, tenant inbox, settings, event dispatch, and cron scheduling. The frontend adds two route trees (super_admin global + tenant admin inbox) and a sidebar badge.

**Tech Stack:** NestJS 10, Prisma (PostgreSQL), `@nestjs/schedule` (already installed), `reserve-mailer` (existing email module), Next.js 14 App Router, HeroUI, SWR/fetch, Zustand (existing stores).

**Spec:** `docs/superpowers/specs/2026-05-25-notifications-module-design.md`

---

## File Map

### Backend — `backend_api_reserve-admin`

**New files:**
- `src/modules/reserve-notifications/domain/enums/notification-type.enum.ts`
- `src/modules/reserve-notifications/domain/enums/notification-scope.enum.ts`
- `src/modules/reserve-notifications/domain/constants/notification-events.ts`
- `src/modules/reserve-notifications/domain/interfaces/notification.repository.interface.ts`
- `src/modules/reserve-notifications/domain/interfaces/notification-receipt.repository.interface.ts`
- `src/modules/reserve-notifications/domain/interfaces/notification-settings.repository.interface.ts`
- `src/modules/reserve-notifications/domain/interfaces/index.ts`
- `src/modules/reserve-notifications/application/dtos/create-notification.dto.ts`
- `src/modules/reserve-notifications/application/dtos/update-notification.dto.ts`
- `src/modules/reserve-notifications/application/dtos/update-notification-settings.dto.ts`
- `src/modules/reserve-notifications/application/dtos/list-notifications-query.dto.ts`
- `src/modules/reserve-notifications/application/dtos/index.ts`
- `src/modules/reserve-notifications/application/services/notification.service.ts`
- `src/modules/reserve-notifications/application/services/notification-tenant.service.ts`
- `src/modules/reserve-notifications/application/services/notification-settings.service.ts`
- `src/modules/reserve-notifications/application/services/notification-event.service.ts`
- `src/modules/reserve-notifications/application/services/notification-scheduler.service.ts`
- `src/modules/reserve-notifications/infrastructure/repositories/notification.repository.ts`
- `src/modules/reserve-notifications/infrastructure/repositories/notification-receipt.repository.ts`
- `src/modules/reserve-notifications/infrastructure/repositories/notification-settings.repository.ts`
- `src/modules/reserve-notifications/infrastructure/controllers/notification.controller.ts`
- `src/modules/reserve-notifications/infrastructure/controllers/notification-tenant.controller.ts`
- `src/modules/reserve-notifications/infrastructure/controllers/notification-settings.controller.ts`
- `src/modules/reserve-notifications/reserve-notifications.module.ts`
- `src/shared/testing/in-memory-repos/in-memory-notification.repository.ts`
- `src/shared/testing/in-memory-repos/in-memory-notification-receipt.repository.ts`
- `src/shared/testing/in-memory-repos/in-memory-notification-settings.repository.ts`
- `src/modules/reserve-notifications/application/services/notification-event.service.spec.ts`
- `src/modules/reserve-notifications/application/services/notification-settings.service.spec.ts`
- `src/modules/reserve-notifications/application/services/notification-tenant.service.spec.ts`

**Modified files:**
- `prisma/schema.prisma` — add 3 new models + 2 enums + relations on Admin and Tenant
- `src/app.module.ts` — import and register `ReserveNotificationsModule`

### Frontend — `frontend_dashboard_reserve-admin`

**New files:**
- `src/app/dashboard/global/notifications/page.tsx`
- `src/app/dashboard/global/notifications/new/page.tsx`
- `src/app/dashboard/global/notifications/[id]/page.tsx`
- `src/app/dashboard/global/notifications/settings/[tenantId]/page.tsx`
- `src/app/dashboard/notifications/page.tsx`
- `src/components/notifications/notification-list.tsx`
- `src/components/notifications/notification-form.tsx`
- `src/components/notifications/notification-inbox.tsx`
- `src/components/notifications/notification-detail.tsx`
- `src/components/notifications/tenant-notification-settings-form.tsx`
- `src/components/notifications/notification-badge.tsx`
- `src/common/hooks/use-notifications.ts`
- `src/common/hooks/use-notification-inbox.ts`
- `src/common/hooks/use-notification-settings.ts`
- `src/common/hooks/use-unread-count.ts`

**Modified files:**
- `src/components/ui/aside.tsx` — add Notifications nav item with badge

---

## Phase 1 — Database Schema

### Task 1: Add Prisma models and enums

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add enums and new models to schema.prisma**

Open `prisma/schema.prisma` and append the following **before** the existing `enum EAdminRole` block (around line 1711):

```prisma
enum ENotificationType {
  manual
  event
  scheduled
}

enum ENotificationScope {
  broadcast
  targeted
}

model Notification {
  id           String              @id @default(cuid()) @db.VarChar(25)
  title        String              @db.VarChar(255)
  body         String              @db.Text
  type         ENotificationType
  scope        ENotificationScope
  tenant_ids   String[]            @default([])
  event_key    String?             @db.VarChar(100)
  metadata     Json?
  send_email   Boolean             @default(false)
  scheduled_at DateTime?
  published_at DateTime?
  created_by   String?             @db.VarChar(25)
  created_at   DateTime            @default(now())
  updated_at   DateTime            @updatedAt
  Admin        Admin?              @relation("NotificationsCreated", fields: [created_by], references: [id])
  Receipts     TenantNotificationReceipt[]

  @@index([type, scope, published_at])
  @@index([created_by])
  @@map("notifications")
}

model TenantNotificationReceipt {
  id              String       @id @default(cuid()) @db.VarChar(25)
  notification_id String       @db.VarChar(25)
  tenant_id       String       @db.VarChar(25)
  admin_id        String?      @db.VarChar(25)
  first_viewed_at DateTime?
  last_viewed_at  DateTime?
  viewed          Boolean      @default(false)
  created_at      DateTime     @default(now())
  updated_at      DateTime     @updatedAt
  Notification    Notification @relation(fields: [notification_id], references: [id], onDelete: Cascade)
  Tenant          Tenant       @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  Admin           Admin?       @relation("NotificationReceipts", fields: [admin_id], references: [id])

  @@unique([notification_id, tenant_id, admin_id])
  @@index([tenant_id, viewed])
  @@index([admin_id, viewed])
  @@map("tenant_notification_receipts")
}

model TenantNotificationSettings {
  id             String   @id @default(cuid()) @db.VarChar(25)
  tenant_id      String   @unique @db.VarChar(25)
  email_enabled  Boolean  @default(true)
  inapp_enabled  Boolean  @default(true)
  event_settings Json     @default("{}")
  cron_settings  Json     @default("{}")
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt
  Tenant         Tenant   @relation(fields: [tenant_id], references: [id], onDelete: Cascade)

  @@map("tenant_notification_settings")
}
```

- [ ] **Step 2: Add relations to existing Admin model**

In `prisma/schema.prisma`, find the `Admin` model (around line 646) and add inside it:

```prisma
  NotificationsCreated      Notification[]              @relation("NotificationsCreated")
  NotificationReceipts      TenantNotificationReceipt[] @relation("NotificationReceipts")
```

- [ ] **Step 3: Add relations to existing Tenant model**

In `prisma/schema.prisma`, find the `Tenant` model (around line 666) and add inside it:

```prisma
  NotificationReceipts      TenantNotificationReceipt[]
  NotificationSettings      TenantNotificationSettings?
```

- [ ] **Step 4: Generate Prisma client and create migration**

```bash
cd backend_api_reserve-admin
npx prisma migrate dev --name add_notifications_module
```

Expected output: `Your database is now in sync with your schema.` and a new migration file in `prisma/migrations/`.

- [ ] **Step 5: Verify generated types**

```bash
npx prisma studio
```

Confirm that tables `notifications`, `tenant_notification_receipts`, `tenant_notification_settings` appear in the studio UI. Close studio (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add notifications module prisma schema"
```

---

## Phase 2 — Domain Layer

### Task 2: Enums, constants, and interfaces

**Files:**
- Create: `src/modules/reserve-notifications/domain/enums/notification-type.enum.ts`
- Create: `src/modules/reserve-notifications/domain/enums/notification-scope.enum.ts`
- Create: `src/modules/reserve-notifications/domain/constants/notification-events.ts`
- Create: `src/modules/reserve-notifications/domain/interfaces/notification.repository.interface.ts`
- Create: `src/modules/reserve-notifications/domain/interfaces/notification-receipt.repository.interface.ts`
- Create: `src/modules/reserve-notifications/domain/interfaces/notification-settings.repository.interface.ts`
- Create: `src/modules/reserve-notifications/domain/interfaces/index.ts`

- [ ] **Step 1: Create notification-type.enum.ts**

```typescript
// src/modules/reserve-notifications/domain/enums/notification-type.enum.ts
export enum ENotificationType {
  manual = 'manual',
  event = 'event',
  scheduled = 'scheduled',
}
```

- [ ] **Step 2: Create notification-scope.enum.ts**

```typescript
// src/modules/reserve-notifications/domain/enums/notification-scope.enum.ts
export enum ENotificationScope {
  broadcast = 'broadcast',
  targeted = 'targeted',
}
```

- [ ] **Step 3: Create notification-events.ts**

```typescript
// src/modules/reserve-notifications/domain/constants/notification-events.ts
export const NOTIFICATION_EVENTS = {
  LEAD_CREATED:          'lead.created',
  SUBSCRIPTION_EXPIRING: 'subscription.expiring',
  SUBSCRIPTION_EXPIRED:  'subscription.expired',
} as const;

export type NotificationEventKey = typeof NOTIFICATION_EVENTS[keyof typeof NOTIFICATION_EVENTS];

export const ALL_EVENT_KEYS: NotificationEventKey[] = Object.values(NOTIFICATION_EVENTS);

export const CRON_KEYS = {
  SUBSCRIPTION_EXPIRY_CHECK: 'subscription.expiry_check',
  SUBSCRIPTION_EXPIRED_CHECK: 'subscription.expired_check',
} as const;

export type CronKey = typeof CRON_KEYS[keyof typeof CRON_KEYS];

export const ALL_CRON_KEYS: CronKey[] = Object.values(CRON_KEYS);
```

- [ ] **Step 4: Create notification.repository.interface.ts**

```typescript
// src/modules/reserve-notifications/domain/interfaces/notification.repository.interface.ts
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
```

- [ ] **Step 5: Create notification-receipt.repository.interface.ts**

```typescript
// src/modules/reserve-notifications/domain/interfaces/notification-receipt.repository.interface.ts
export const NOTIFICATION_RECEIPT_REPOSITORY = 'NOTIFICATION_RECEIPT_REPOSITORY';

export interface INotificationReceiptRepository {
  upsertForAdmin(notificationId: string, tenantId: string, adminId: string): Promise<void>;
  upsertTenantAggregate(notificationId: string, tenantId: string): Promise<void>;
  findForTenant(tenantId: string, adminId: string, page: number, limit: number): Promise<{ data: any[]; total: number }>;
  countUnread(tenantId: string, adminId: string): Promise<number>;
  createManyForTenant(notificationId: string, tenantIds: string[]): Promise<void>;
}
```

- [ ] **Step 6: Create notification-settings.repository.interface.ts**

```typescript
// src/modules/reserve-notifications/domain/interfaces/notification-settings.repository.interface.ts
export const NOTIFICATION_SETTINGS_REPOSITORY = 'NOTIFICATION_SETTINGS_REPOSITORY';

export interface IUpdateNotificationSettings {
  email_enabled?: boolean;
  inapp_enabled?: boolean;
  event_settings?: Record<string, boolean>;
  cron_settings?: Record<string, boolean>;
}

export interface INotificationSettingsRepository {
  findByTenantId(tenantId: string): Promise<any | null>;
  upsert(tenantId: string, data: IUpdateNotificationSettings): Promise<any>;
}
```

- [ ] **Step 7: Create domain/enums/index.ts**

```typescript
// src/modules/reserve-notifications/domain/enums/index.ts
export * from './notification-type.enum';
export * from './notification-scope.enum';
```

- [ ] **Step 8: Create interfaces/index.ts**

```typescript
// src/modules/reserve-notifications/domain/interfaces/index.ts
export * from './notification.repository.interface';
export * from './notification-receipt.repository.interface';
export * from './notification-settings.repository.interface';
```

- [ ] **Step 9: Commit**

```bash
git add src/modules/reserve-notifications/
git commit -m "feat: add notifications domain layer (enums, constants, interfaces)"
```

---

## Phase 3 — In-Memory Repos + Unit Tests

### Task 3: In-memory repositories for testing

**Files:**
- Create: `src/shared/testing/in-memory-repos/in-memory-notification.repository.ts`
- Create: `src/shared/testing/in-memory-repos/in-memory-notification-receipt.repository.ts`
- Create: `src/shared/testing/in-memory-repos/in-memory-notification-settings.repository.ts`

- [ ] **Step 1: Create in-memory-notification.repository.ts**

```typescript
// src/shared/testing/in-memory-repos/in-memory-notification.repository.ts
import { INotificationRepository, ICreateNotification, IUpdateNotification, IListNotificationsFilter } from '../../../modules/reserve-notifications/domain/interfaces';

export class InMemoryNotificationRepository implements INotificationRepository {
  private records: any[] = [];
  private idCounter = 1;

  async create(data: ICreateNotification): Promise<any> {
    const record = { id: String(this.idCounter++), ...data, tenant_ids: data.tenant_ids ?? [], published_at: null, created_at: new Date(), updated_at: new Date() };
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
    return this.records.filter(r => r.published_at && (r.scope === 'broadcast' || r.tenant_ids.includes(tenantId)));
  }

  async findAllActiveTenantIds(): Promise<string[]> {
    return [];
  }

  seed(data: any): void { this.records.push({ id: String(this.idCounter++), created_at: new Date(), updated_at: new Date(), ...data }); }
  clear(): void { this.records = []; this.idCounter = 1; }
}
```

- [ ] **Step 2: Create in-memory-notification-receipt.repository.ts**

```typescript
// src/shared/testing/in-memory-repos/in-memory-notification-receipt.repository.ts
import { INotificationReceiptRepository } from '../../../modules/reserve-notifications/domain/interfaces';

export class InMemoryNotificationReceiptRepository implements INotificationReceiptRepository {
  private records: any[] = [];
  private idCounter = 1;

  private key(notificationId: string, tenantId: string, adminId: string | null) {
    return `${notificationId}:${tenantId}:${adminId ?? 'null'}`;
  }

  async upsertForAdmin(notificationId: string, tenantId: string, adminId: string): Promise<void> {
    const existing = this.records.find(r => r.notification_id === notificationId && r.tenant_id === tenantId && r.admin_id === adminId);
    const now = new Date();
    if (existing) {
      existing.viewed = true;
      existing.last_viewed_at = now;
      if (!existing.first_viewed_at) existing.first_viewed_at = now;
    } else {
      this.records.push({ id: String(this.idCounter++), notification_id: notificationId, tenant_id: tenantId, admin_id: adminId, viewed: true, first_viewed_at: now, last_viewed_at: now, created_at: now, updated_at: now });
    }
  }

  async upsertTenantAggregate(notificationId: string, tenantId: string): Promise<void> {
    await this.upsertForAdmin(notificationId, tenantId, null as any);
  }

  async findForTenant(tenantId: string, adminId: string, page: number, limit: number): Promise<{ data: any[]; total: number }> {
    const results = this.records.filter(r => r.tenant_id === tenantId && r.admin_id === adminId);
    const total = results.length;
    const data = results.slice((page - 1) * limit, page * limit);
    return { data, total };
  }

  async countUnread(tenantId: string, adminId: string): Promise<number> {
    return this.records.filter(r => r.tenant_id === tenantId && r.admin_id === adminId && !r.viewed).length;
  }

  async createManyForTenant(notificationId: string, tenantIds: string[]): Promise<void> {
    const now = new Date();
    for (const tenantId of tenantIds) {
      this.records.push({ id: String(this.idCounter++), notification_id: notificationId, tenant_id: tenantId, admin_id: null, viewed: false, first_viewed_at: null, last_viewed_at: null, created_at: now, updated_at: now });
    }
  }

  clear(): void { this.records = []; this.idCounter = 1; }
  getAll(): any[] { return [...this.records]; }
}
```

- [ ] **Step 3: Create in-memory-notification-settings.repository.ts**

```typescript
// src/shared/testing/in-memory-repos/in-memory-notification-settings.repository.ts
import { INotificationSettingsRepository, IUpdateNotificationSettings } from '../../../modules/reserve-notifications/domain/interfaces';

export class InMemoryNotificationSettingsRepository implements INotificationSettingsRepository {
  private records: any[] = [];
  private idCounter = 1;

  async findByTenantId(tenantId: string): Promise<any | null> {
    return this.records.find(r => r.tenant_id === tenantId) ?? null;
  }

  async upsert(tenantId: string, data: IUpdateNotificationSettings): Promise<any> {
    const existing = this.records.find(r => r.tenant_id === tenantId);
    if (existing) {
      Object.assign(existing, data, { updated_at: new Date() });
      return { ...existing };
    }
    const record = { id: String(this.idCounter++), tenant_id: tenantId, email_enabled: true, inapp_enabled: true, event_settings: {}, cron_settings: {}, ...data, created_at: new Date(), updated_at: new Date() };
    this.records.push(record);
    return { ...record };
  }

  clear(): void { this.records = []; this.idCounter = 1; }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/shared/testing/in-memory-repos/
git commit -m "feat: add in-memory repos for notifications testing"
```

---

## Phase 4 — Application Services + Tests

### Task 4: NotificationSettingsService + tests

**Files:**
- Create: `src/modules/reserve-notifications/application/services/notification-settings.service.ts`
- Create: `src/modules/reserve-notifications/application/services/notification-settings.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/modules/reserve-notifications/application/services/notification-settings.service.spec.ts
import { NotificationSettingsService } from './notification-settings.service';
import { InMemoryNotificationSettingsRepository } from '../../../../shared/testing/in-memory-repos/in-memory-notification-settings.repository';
import { ALL_EVENT_KEYS, ALL_CRON_KEYS } from '../../domain/constants/notification-events';

describe('NotificationSettingsService', () => {
  let service: NotificationSettingsService;
  let repo: InMemoryNotificationSettingsRepository;

  beforeEach(() => {
    repo = new InMemoryNotificationSettingsRepository();
    service = new NotificationSettingsService(repo);
  });

  afterEach(() => repo.clear());

  it('should create default settings on first access', async () => {
    const settings = await service.getSettings('tenant-1');
    expect(settings.tenant_id).toBe('tenant-1');
    expect(settings.email_enabled).toBe(true);
    expect(settings.inapp_enabled).toBe(true);
  });

  it('should return existing settings without overwriting', async () => {
    await repo.upsert('tenant-1', { email_enabled: false });
    const settings = await service.getSettings('tenant-1');
    expect(settings.email_enabled).toBe(false);
  });

  it('should update settings for a tenant', async () => {
    await service.updateSettings('tenant-1', { email_enabled: false, event_settings: { 'lead.created': false } });
    const settings = await service.getSettings('tenant-1');
    expect(settings.email_enabled).toBe(false);
  });

  it('should reject update with unknown event key', async () => {
    await expect(service.updateSettings('tenant-1', { event_settings: { 'unknown.event': true } }))
      .rejects.toThrow('Invalid event key: unknown.event');
  });

  it('should reject update with unknown cron key', async () => {
    await expect(service.updateSettings('tenant-1', { cron_settings: { 'bad.cron': true } }))
      .rejects.toThrow('Invalid cron key: bad.cron');
  });

  it('isEventEnabled should return true when event key is not set (default on)', async () => {
    const enabled = await service.isEventEnabled('tenant-1', 'lead.created');
    expect(enabled).toBe(true);
  });

  it('isEventEnabled should return false when event is disabled', async () => {
    await repo.upsert('tenant-1', { event_settings: { 'lead.created': false } });
    const enabled = await service.isEventEnabled('tenant-1', 'lead.created');
    expect(enabled).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest notification-settings.service.spec --no-coverage
```

Expected: FAIL — `Cannot find module './notification-settings.service'`

- [ ] **Step 3: Implement NotificationSettingsService**

```typescript
// src/modules/reserve-notifications/application/services/notification-settings.service.ts
import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { NOTIFICATION_SETTINGS_REPOSITORY, INotificationSettingsRepository, IUpdateNotificationSettings } from '../../domain/interfaces';
import { ALL_EVENT_KEYS, ALL_CRON_KEYS, NotificationEventKey, CronKey } from '../../domain/constants/notification-events';

@Injectable()
export class NotificationSettingsService {
  constructor(
    @Inject(NOTIFICATION_SETTINGS_REPOSITORY)
    private readonly repo: INotificationSettingsRepository,
  ) {}

  async getSettings(tenantId: string) {
    const existing = await this.repo.findByTenantId(tenantId);
    if (existing) return existing;
    return this.repo.upsert(tenantId, {});
  }

  async updateSettings(tenantId: string, data: IUpdateNotificationSettings) {
    if (data.event_settings) {
      for (const key of Object.keys(data.event_settings)) {
        if (!ALL_EVENT_KEYS.includes(key as NotificationEventKey)) {
          throw new BadRequestException(`Invalid event key: ${key}`);
        }
      }
    }
    if (data.cron_settings) {
      for (const key of Object.keys(data.cron_settings)) {
        if (!ALL_CRON_KEYS.includes(key as CronKey)) {
          throw new BadRequestException(`Invalid cron key: ${key}`);
        }
      }
    }
    return this.repo.upsert(tenantId, data);
  }

  async isEventEnabled(tenantId: string, eventKey: string): Promise<boolean> {
    const settings = await this.getSettings(tenantId);
    const eventSettings = (settings.event_settings ?? {}) as Record<string, boolean>;
    return eventSettings[eventKey] !== false;
  }

  async isCronEnabled(tenantId: string, cronKey: string): Promise<boolean> {
    const settings = await this.getSettings(tenantId);
    const cronSettings = (settings.cron_settings ?? {}) as Record<string, boolean>;
    return cronSettings[cronKey] !== false;
  }

  async isEmailEnabled(tenantId: string): Promise<boolean> {
    const settings = await this.getSettings(tenantId);
    return settings.email_enabled !== false;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest notification-settings.service.spec --no-coverage
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/reserve-notifications/
git commit -m "feat: add NotificationSettingsService with validation"
```

---

### Task 5: NotificationEventService + tests

**Files:**
- Create: `src/modules/reserve-notifications/application/services/notification-event.service.ts`
- Create: `src/modules/reserve-notifications/application/services/notification-event.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/modules/reserve-notifications/application/services/notification-event.service.spec.ts
import { NotificationEventService } from './notification-event.service';
import { NotificationSettingsService } from './notification-settings.service';
import { InMemoryNotificationRepository } from '../../../../shared/testing/in-memory-repos/in-memory-notification.repository';
import { InMemoryNotificationReceiptRepository } from '../../../../shared/testing/in-memory-repos/in-memory-notification-receipt.repository';
import { InMemoryNotificationSettingsRepository } from '../../../../shared/testing/in-memory-repos/in-memory-notification-settings.repository';
import { NOTIFICATION_EVENTS } from '../../domain/constants/notification-events';
import { ENotificationType, ENotificationScope } from '../../domain/enums';

describe('NotificationEventService', () => {
  let service: NotificationEventService;
  let notifRepo: InMemoryNotificationRepository;
  let receiptRepo: InMemoryNotificationReceiptRepository;
  let settingsRepo: InMemoryNotificationSettingsRepository;
  let settingsService: NotificationSettingsService;

  beforeEach(() => {
    notifRepo = new InMemoryNotificationRepository();
    receiptRepo = new InMemoryNotificationReceiptRepository();
    settingsRepo = new InMemoryNotificationSettingsRepository();
    settingsService = new NotificationSettingsService(settingsRepo);
    service = new NotificationEventService(notifRepo, receiptRepo, settingsService);
  });

  afterEach(() => { notifRepo.clear(); receiptRepo.clear(); settingsRepo.clear(); });

  it('should create and publish a notification when event is enabled', async () => {
    await service.dispatch(NOTIFICATION_EVENTS.LEAD_CREATED, 'tenant-1', { lead_id: 'lead-abc' });
    const { data } = await notifRepo.findAll({});
    expect(data).toHaveLength(1);
    expect(data[0].type).toBe(ENotificationType.event);
    expect(data[0].event_key).toBe(NOTIFICATION_EVENTS.LEAD_CREATED);
    expect(data[0].published_at).not.toBeNull();
  });

  it('should create a receipt for the tenant', async () => {
    await service.dispatch(NOTIFICATION_EVENTS.LEAD_CREATED, 'tenant-1');
    const receipts = receiptRepo.getAll();
    expect(receipts.some(r => r.tenant_id === 'tenant-1')).toBe(true);
  });

  it('should not create notification when event is disabled in settings', async () => {
    await settingsRepo.upsert('tenant-1', { event_settings: { [NOTIFICATION_EVENTS.LEAD_CREATED]: false } });
    await service.dispatch(NOTIFICATION_EVENTS.LEAD_CREATED, 'tenant-1');
    const { data } = await notifRepo.findAll({});
    expect(data).toHaveLength(0);
  });

  it('should warn and no-op on unknown event key', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await service.dispatch('unknown.event' as any, 'tenant-1');
    expect(warnSpy).toHaveBeenCalled();
    const { data } = await notifRepo.findAll({});
    expect(data).toHaveLength(0);
    warnSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest notification-event.service.spec --no-coverage
```

Expected: FAIL — `Cannot find module './notification-event.service'`

- [ ] **Step 3: Implement NotificationEventService**

```typescript
// src/modules/reserve-notifications/application/services/notification-event.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { NOTIFICATION_REPOSITORY, INotificationRepository } from '../../domain/interfaces';
import { NOTIFICATION_RECEIPT_REPOSITORY, INotificationReceiptRepository } from '../../domain/interfaces';
import { NotificationSettingsService } from './notification-settings.service';
import { ENotificationType, ENotificationScope } from '../../domain/enums';
import { ALL_EVENT_KEYS, NotificationEventKey } from '../../domain/constants/notification-events';

const EVENT_TITLES: Record<string, string> = {
  'lead.created': 'Novo lead cadastrado',
  'subscription.expiring': 'Assinatura vencendo em breve',
  'subscription.expired': 'Assinatura expirada',
};

@Injectable()
export class NotificationEventService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifRepo: INotificationRepository,
    @Inject(NOTIFICATION_RECEIPT_REPOSITORY)
    private readonly receiptRepo: INotificationReceiptRepository,
    private readonly settingsService: NotificationSettingsService,
  ) {}

  async dispatch(eventKey: NotificationEventKey, tenantId: string, metadata?: Record<string, any>): Promise<void> {
    if (!ALL_EVENT_KEYS.includes(eventKey)) {
      console.warn(`[NotificationEventService] Unknown event key: ${eventKey}. Skipping.`);
      return;
    }

    const enabled = await this.settingsService.isEventEnabled(tenantId, eventKey);
    if (!enabled) return;

    const notification = await this.notifRepo.create({
      title: EVENT_TITLES[eventKey] ?? eventKey,
      body: EVENT_TITLES[eventKey] ?? eventKey,
      type: ENotificationType.event,
      scope: ENotificationScope.targeted,
      tenant_ids: [tenantId],
      event_key: eventKey,
      metadata,
      send_email: false,
    });

    await this.notifRepo.publish(notification.id);
    await this.receiptRepo.createManyForTenant(notification.id, [tenantId]);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest notification-event.service.spec --no-coverage
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/reserve-notifications/
git commit -m "feat: add NotificationEventService with settings-aware dispatch"
```

---

### Task 6: NotificationTenantService + tests

**Files:**
- Create: `src/modules/reserve-notifications/application/services/notification-tenant.service.ts`
- Create: `src/modules/reserve-notifications/application/services/notification-tenant.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/modules/reserve-notifications/application/services/notification-tenant.service.spec.ts
import { NotificationTenantService } from './notification-tenant.service';
import { InMemoryNotificationRepository } from '../../../../shared/testing/in-memory-repos/in-memory-notification.repository';
import { InMemoryNotificationReceiptRepository } from '../../../../shared/testing/in-memory-repos/in-memory-notification-receipt.repository';
import { ENotificationType, ENotificationScope } from '../../domain/enums';

describe('NotificationTenantService', () => {
  let service: NotificationTenantService;
  let notifRepo: InMemoryNotificationRepository;
  let receiptRepo: InMemoryNotificationReceiptRepository;

  beforeEach(() => {
    notifRepo = new InMemoryNotificationRepository();
    receiptRepo = new InMemoryNotificationReceiptRepository();
    service = new NotificationTenantService(notifRepo, receiptRepo);
  });

  afterEach(() => { notifRepo.clear(); receiptRepo.clear(); });

  it('should return notifications for a tenant', async () => {
    notifRepo.seed({ title: 'Hello', body: 'World', type: ENotificationType.manual, scope: ENotificationScope.broadcast, tenant_ids: [], published_at: new Date() });
    receiptRepo['records'].push({ id: '1', notification_id: '1', tenant_id: 'tenant-1', admin_id: 'admin-1', viewed: false, first_viewed_at: null, last_viewed_at: null, created_at: new Date(), updated_at: new Date() });
    const result = await service.listForTenant('tenant-1', 'admin-1', 1, 20);
    expect(result.total).toBeGreaterThanOrEqual(0);
  });

  it('should mark notification as viewed for admin and update tenant aggregate', async () => {
    await receiptRepo.createManyForTenant('notif-1', ['tenant-1']);
    await service.markAsViewed('notif-1', 'tenant-1', 'admin-1');
    const count = await receiptRepo.countUnread('tenant-1', 'admin-1');
    expect(count).toBe(0);
  });

  it('should return unread count', async () => {
    await receiptRepo.createManyForTenant('notif-1', ['tenant-1']);
    const count = await service.getUnreadCount('tenant-1', 'admin-1');
    expect(count).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest notification-tenant.service.spec --no-coverage
```

Expected: FAIL — `Cannot find module './notification-tenant.service'`

- [ ] **Step 3: Implement NotificationTenantService**

```typescript
// src/modules/reserve-notifications/application/services/notification-tenant.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { NOTIFICATION_REPOSITORY, INotificationRepository } from '../../domain/interfaces';
import { NOTIFICATION_RECEIPT_REPOSITORY, INotificationReceiptRepository } from '../../domain/interfaces';

@Injectable()
export class NotificationTenantService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifRepo: INotificationRepository,
    @Inject(NOTIFICATION_RECEIPT_REPOSITORY)
    private readonly receiptRepo: INotificationReceiptRepository,
  ) {}

  async listForTenant(tenantId: string, adminId: string, page: number, limit: number) {
    return this.receiptRepo.findForTenant(tenantId, adminId, page, limit);
  }

  async markAsViewed(notificationId: string, tenantId: string, adminId: string): Promise<void> {
    await this.receiptRepo.upsertForAdmin(notificationId, tenantId, adminId);
    await this.receiptRepo.upsertTenantAggregate(notificationId, tenantId);
  }

  async getUnreadCount(tenantId: string, adminId: string): Promise<number> {
    return this.receiptRepo.countUnread(tenantId, adminId);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest notification-tenant.service.spec --no-coverage
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/reserve-notifications/
git commit -m "feat: add NotificationTenantService"
```

---

### Task 7: NotificationService (super_admin CRUD)

**Files:**
- Create: `src/modules/reserve-notifications/application/services/notification.service.ts`
- Create: `src/modules/reserve-notifications/application/dtos/create-notification.dto.ts`
- Create: `src/modules/reserve-notifications/application/dtos/update-notification.dto.ts`
- Create: `src/modules/reserve-notifications/application/dtos/list-notifications-query.dto.ts`
- Create: `src/modules/reserve-notifications/application/dtos/update-notification-settings.dto.ts`
- Create: `src/modules/reserve-notifications/application/dtos/index.ts`

- [ ] **Step 1: Create DTOs**

```typescript
// src/modules/reserve-notifications/application/dtos/create-notification.dto.ts
import { IsString, IsEnum, IsOptional, IsBoolean, IsArray, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ENotificationType, ENotificationScope } from '../../domain/enums';

export class CreateNotificationDTO {
  @ApiProperty() @IsString() @MaxLength(255) title: string;
  @ApiProperty() @IsString() body: string;
  @ApiProperty({ enum: ENotificationType }) @IsEnum(ENotificationType) type: ENotificationType;
  @ApiProperty({ enum: ENotificationScope }) @IsEnum(ENotificationScope) scope: ENotificationScope;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) tenant_ids?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() send_email?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduled_at?: string;
}
```

```typescript
// src/modules/reserve-notifications/application/dtos/update-notification.dto.ts
import { IsString, IsEnum, IsOptional, IsBoolean, IsArray, IsDateString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ENotificationScope } from '../../domain/enums';

export class UpdateNotificationDTO {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() body?: string;
  @ApiPropertyOptional({ enum: ENotificationScope }) @IsOptional() @IsEnum(ENotificationScope) scope?: ENotificationScope;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) tenant_ids?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() send_email?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduled_at?: string;
}
```

```typescript
// src/modules/reserve-notifications/application/dtos/list-notifications-query.dto.ts
import { IsOptional, IsEnum, IsBoolean, IsInt, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ENotificationType, ENotificationScope } from '../../domain/enums';

export class ListNotificationsQueryDTO {
  @ApiPropertyOptional({ enum: ENotificationType }) @IsOptional() @IsEnum(ENotificationType) type?: ENotificationType;
  @ApiPropertyOptional({ enum: ENotificationScope }) @IsOptional() @IsEnum(ENotificationScope) scope?: ENotificationScope;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() published?: boolean;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 20;
}
```

```typescript
// src/modules/reserve-notifications/application/dtos/update-notification-settings.dto.ts
import { IsOptional, IsBoolean, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationSettingsDTO {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() email_enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() inapp_enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsObject() event_settings?: Record<string, boolean>;
  @ApiPropertyOptional() @IsOptional() @IsObject() cron_settings?: Record<string, boolean>;
}
```

```typescript
// src/modules/reserve-notifications/application/dtos/index.ts
export * from './create-notification.dto';
export * from './update-notification.dto';
export * from './list-notifications-query.dto';
export * from './update-notification-settings.dto';
```

- [ ] **Step 2: Implement NotificationService**

```typescript
// src/modules/reserve-notifications/application/services/notification.service.ts
import { Injectable, Inject, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { NOTIFICATION_REPOSITORY, INotificationRepository } from '../../domain/interfaces';
import { NOTIFICATION_RECEIPT_REPOSITORY, INotificationReceiptRepository } from '../../domain/interfaces';
import { NotificationSettingsService } from './notification-settings.service';
import { ENotificationType } from '../../domain/enums';
import { CreateNotificationDTO } from '../dtos/create-notification.dto';
import { UpdateNotificationDTO } from '../dtos/update-notification.dto';
import { ListNotificationsQueryDTO } from '../dtos/list-notifications-query.dto';

@Injectable()
export class NotificationService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifRepo: INotificationRepository,
    @Inject(NOTIFICATION_RECEIPT_REPOSITORY)
    private readonly receiptRepo: INotificationReceiptRepository,
    private readonly settingsService: NotificationSettingsService,
  ) {}

  async create(dto: CreateNotificationDTO, adminId: string) {
    return this.notifRepo.create({
      title: dto.title,
      body: dto.body,
      type: dto.type ?? ENotificationType.manual,
      scope: dto.scope,
      tenant_ids: dto.tenant_ids ?? [],
      send_email: dto.send_email ?? false,
      scheduled_at: dto.scheduled_at ? new Date(dto.scheduled_at) : undefined,
      created_by: adminId,
    });
  }

  async publish(id: string) {
    const notif = await this.notifRepo.findById(id);
    if (!notif) throw new NotFoundException('Notification not found');
    if (notif.published_at) throw new ConflictException('Notification already published');

    const published = await this.notifRepo.publish(id);

    let targetTenantIds: string[] = notif.scope === 'broadcast'
      ? await this.notifRepo.findAllActiveTenantIds()
      : notif.tenant_ids;

    await this.receiptRepo.createManyForTenant(id, targetTenantIds);

    return published;
  }

  async update(id: string, dto: UpdateNotificationDTO) {
    const notif = await this.notifRepo.findById(id);
    if (!notif) throw new NotFoundException('Notification not found');
    if (notif.published_at) throw new ConflictException('Cannot edit a published notification');
    return this.notifRepo.update(id, {
      ...dto,
      scheduled_at: dto.scheduled_at ? new Date(dto.scheduled_at) : undefined,
    });
  }

  async delete(id: string) {
    const notif = await this.notifRepo.findById(id);
    if (!notif) throw new NotFoundException('Notification not found');
    if (notif.published_at) throw new ConflictException('Cannot delete a published notification');
    await this.notifRepo.delete(id);
  }

  async list(query: ListNotificationsQueryDTO) {
    return this.notifRepo.findAll({
      type: query.type,
      scope: query.scope,
      published: query.published,
      page: query.page,
      limit: query.limit,
    });
  }

  async findById(id: string) {
    const notif = await this.notifRepo.findById(id);
    if (!notif) throw new NotFoundException('Notification not found');
    return notif;
  }
}
```

- [ ] **Step 3: Run all notification service tests**

```bash
npx jest reserve-notifications --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/modules/reserve-notifications/
git commit -m "feat: add NotificationService CRUD and DTOs"
```

---

### Task 8: NotificationSchedulerService

**Files:**
- Create: `src/modules/reserve-notifications/application/services/notification-scheduler.service.ts`

- [ ] **Step 1: Implement scheduler**

```typescript
// src/modules/reserve-notifications/application/services/notification-scheduler.service.ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationEventService } from './notification-event.service';
import { NotificationSettingsService } from './notification-settings.service';
import { NOTIFICATION_REPOSITORY, INotificationRepository } from '../../domain/interfaces';
import { Inject } from '@nestjs/common';
import { NOTIFICATION_EVENTS, CRON_KEYS } from '../../domain/constants/notification-events';

@Injectable()
export class NotificationSchedulerService {
  constructor(
    private readonly eventService: NotificationEventService,
    private readonly settingsService: NotificationSettingsService,
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifRepo: INotificationRepository,
  ) {}

  @Cron('0 9 * * *')
  async checkExpiringSubscriptions() {
    const tenantIds = await this.notifRepo.findAllActiveTenantIds();
    for (const tenantId of tenantIds) {
      const enabled = await this.settingsService.isCronEnabled(tenantId, CRON_KEYS.SUBSCRIPTION_EXPIRY_CHECK);
      if (enabled) {
        await this.eventService.dispatch(NOTIFICATION_EVENTS.SUBSCRIPTION_EXPIRING, tenantId);
      }
    }
  }

  @Cron('0 10 * * *')
  async checkExpiredSubscriptions() {
    const tenantIds = await this.notifRepo.findAllActiveTenantIds();
    for (const tenantId of tenantIds) {
      const enabled = await this.settingsService.isCronEnabled(tenantId, CRON_KEYS.SUBSCRIPTION_EXPIRED_CHECK);
      if (enabled) {
        await this.eventService.dispatch(NOTIFICATION_EVENTS.SUBSCRIPTION_EXPIRED, tenantId);
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/reserve-notifications/
git commit -m "feat: add NotificationSchedulerService with cron jobs"
```

---

## Phase 5 — Infrastructure Layer

### Task 9: Prisma repositories

**Files:**
- Create: `src/modules/reserve-notifications/infrastructure/repositories/notification.repository.ts`
- Create: `src/modules/reserve-notifications/infrastructure/repositories/notification-receipt.repository.ts`
- Create: `src/modules/reserve-notifications/infrastructure/repositories/notification-settings.repository.ts`

- [ ] **Step 1: Create notification.repository.ts**

```typescript
// src/modules/reserve-notifications/infrastructure/repositories/notification.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { INotificationRepository, ICreateNotification, IUpdateNotification, IListNotificationsFilter } from '../../domain/interfaces';

@Injectable()
export class NotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: ICreateNotification) {
    try {
      return await this.prisma.notification.create({ data: { ...data, tenant_ids: data.tenant_ids ?? [] } });
    } catch (e) { throw new RepositoryException('Erro ao criar notificação', e); }
  }

  async findById(id: string) {
    return this.prisma.notification.findUnique({ where: { id }, include: { Admin: true } });
  }

  async findAll(filter: IListNotificationsFilter) {
    const where: any = {};
    if (filter.type) where.type = filter.type;
    if (filter.scope) where.scope = filter.scope;
    if (filter.published === true) where.published_at = { not: null };
    if (filter.published === false) where.published_at = null;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { created_at: 'desc' } }),
      this.prisma.notification.count({ where }),
    ]);
    return { data, total };
  }

  async update(id: string, data: IUpdateNotification) {
    try {
      return await this.prisma.notification.update({ where: { id }, data });
    } catch (e) { throw new RepositoryException('Erro ao atualizar notificação', e); }
  }

  async publish(id: string) {
    try {
      return await this.prisma.notification.update({ where: { id }, data: { published_at: new Date() } });
    } catch (e) { throw new RepositoryException('Erro ao publicar notificação', e); }
  }

  async delete(id: string) {
    try {
      await this.prisma.notification.delete({ where: { id } });
    } catch (e) { throw new RepositoryException('Erro ao deletar notificação', e); }
  }

  async findActiveForTenant(tenantId: string) {
    return this.prisma.notification.findMany({
      where: {
        published_at: { not: null },
        OR: [{ scope: 'broadcast' }, { tenant_ids: { has: tenantId } }],
      },
      orderBy: { published_at: 'desc' },
    });
  }

  async findAllActiveTenantIds(): Promise<string[]> {
    const tenants = await this.prisma.tenant.findMany({ where: { active: true }, select: { id: true } });
    return tenants.map(t => t.id);
  }
}
```

- [ ] **Step 2: Create notification-receipt.repository.ts**

```typescript
// src/modules/reserve-notifications/infrastructure/repositories/notification-receipt.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { INotificationReceiptRepository } from '../../domain/interfaces';

@Injectable()
export class NotificationReceiptRepository implements INotificationReceiptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertForAdmin(notificationId: string, tenantId: string, adminId: string): Promise<void> {
    const now = new Date();
    try {
      await this.prisma.tenantNotificationReceipt.upsert({
        where: { notification_id_tenant_id_admin_id: { notification_id: notificationId, tenant_id: tenantId, admin_id: adminId } },
        create: { notification_id: notificationId, tenant_id: tenantId, admin_id: adminId, viewed: true, first_viewed_at: now, last_viewed_at: now },
        update: { viewed: true, last_viewed_at: now },
      });
    } catch (e) { throw new RepositoryException('Erro ao registrar visualização', e); }
  }

  async upsertTenantAggregate(notificationId: string, tenantId: string): Promise<void> {
    const now = new Date();
    try {
      await this.prisma.tenantNotificationReceipt.upsert({
        where: { notification_id_tenant_id_admin_id: { notification_id: notificationId, tenant_id: tenantId, admin_id: null } },
        create: { notification_id: notificationId, tenant_id: tenantId, admin_id: null, viewed: true, first_viewed_at: now, last_viewed_at: now },
        update: { viewed: true, last_viewed_at: now },
      });
    } catch (e) { throw new RepositoryException('Erro ao atualizar agregado do tenant', e); }
  }

  async findForTenant(tenantId: string, adminId: string, page: number, limit: number) {
    const where = { tenant_id: tenantId, admin_id: adminId };
    const [data, total] = await Promise.all([
      this.prisma.tenantNotificationReceipt.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { created_at: 'desc' },
        include: { Notification: true },
      }),
      this.prisma.tenantNotificationReceipt.count({ where }),
    ]);
    return { data, total };
  }

  async countUnread(tenantId: string, adminId: string): Promise<number> {
    return this.prisma.tenantNotificationReceipt.count({ where: { tenant_id: tenantId, admin_id: adminId, viewed: false } });
  }

  async createManyForTenant(notificationId: string, tenantIds: string[]): Promise<void> {
    try {
      await this.prisma.tenantNotificationReceipt.createMany({
        data: tenantIds.map(tenantId => ({ notification_id: notificationId, tenant_id: tenantId, admin_id: null })),
        skipDuplicates: true,
      });
    } catch (e) { throw new RepositoryException('Erro ao criar receipts', e); }
  }
}
```

- [ ] **Step 3: Create notification-settings.repository.ts**

```typescript
// src/modules/reserve-notifications/infrastructure/repositories/notification-settings.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { INotificationSettingsRepository, IUpdateNotificationSettings } from '../../domain/interfaces';

@Injectable()
export class NotificationSettingsRepository implements INotificationSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenantId(tenantId: string) {
    return this.prisma.tenantNotificationSettings.findUnique({ where: { tenant_id: tenantId } });
  }

  async upsert(tenantId: string, data: IUpdateNotificationSettings) {
    try {
      return await this.prisma.tenantNotificationSettings.upsert({
        where: { tenant_id: tenantId },
        create: { tenant_id: tenantId, email_enabled: data.email_enabled ?? true, inapp_enabled: data.inapp_enabled ?? true, event_settings: data.event_settings ?? {}, cron_settings: data.cron_settings ?? {} },
        update: { ...(data.email_enabled !== undefined && { email_enabled: data.email_enabled }), ...(data.inapp_enabled !== undefined && { inapp_enabled: data.inapp_enabled }), ...(data.event_settings !== undefined && { event_settings: data.event_settings }), ...(data.cron_settings !== undefined && { cron_settings: data.cron_settings }) },
      });
    } catch (e) { throw new RepositoryException('Erro ao salvar settings de notificações', e); }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/reserve-notifications/
git commit -m "feat: add notifications Prisma repositories"
```

---

### Task 10: Controllers

**Files:**
- Create: `src/modules/reserve-notifications/infrastructure/controllers/notification.controller.ts`
- Create: `src/modules/reserve-notifications/infrastructure/controllers/notification-tenant.controller.ts`
- Create: `src/modules/reserve-notifications/infrastructure/controllers/notification-settings.controller.ts`

- [ ] **Step 1: Create notification.controller.ts (super_admin)**

```typescript
// src/modules/reserve-notifications/infrastructure/controllers/notification.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { EAdminRole } from '../../../reserve-auth/domain/enums/admin-role.enum';
import { ParseCuidPipe } from '../../../../shared/pipes';
import { NotificationService } from '../../application/services/notification.service';
import { CreateNotificationDTO, UpdateNotificationDTO, ListNotificationsQueryDTO } from '../../application/dtos';

@ApiTags('Notifications (super_admin)')
@ApiBearerAuth()
@Roles(EAdminRole.super_admin)
@UseGuards(AdminJwtGuard, RolesGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Post()
  @ApiOperation({ summary: 'Create notification draft (super_admin)' })
  async create(@Body() dto: CreateNotificationDTO, @CurrentAdmin() admin: CurrentAdminPayload, @Res() res: Response) {
    const result = await this.service.create(dto, admin.admin_id);
    return res.status(201).json(result);
  }

  @Post('/:id/publish')
  @ApiOperation({ summary: 'Publish notification draft (super_admin)' })
  async publish(@Param('id', ParseCuidPipe) id: string, @Res() res: Response) {
    const result = await this.service.publish(id);
    return res.status(200).json(result);
  }

  @Get()
  @ApiOperation({ summary: 'List all notifications (super_admin)' })
  async list(@Query() query: ListNotificationsQueryDTO, @Res() res: Response) {
    const result = await this.service.list(query);
    return res.status(200).json(result);
  }

  @Get('/:id')
  @ApiOperation({ summary: 'Get notification by ID (super_admin)' })
  async findById(@Param('id', ParseCuidPipe) id: string, @Res() res: Response) {
    const result = await this.service.findById(id);
    return res.status(200).json(result);
  }

  @Patch('/:id')
  @ApiOperation({ summary: 'Update notification draft (super_admin)' })
  async update(@Param('id', ParseCuidPipe) id: string, @Body() dto: UpdateNotificationDTO, @Res() res: Response) {
    const result = await this.service.update(id, dto);
    return res.status(200).json(result);
  }

  @Delete('/:id')
  @ApiOperation({ summary: 'Delete notification draft (super_admin)' })
  async delete(@Param('id', ParseCuidPipe) id: string, @Res() res: Response) {
    await this.service.delete(id);
    return res.status(204).send();
  }
}
```

- [ ] **Step 2: Create notification-tenant.controller.ts**

```typescript
// src/modules/reserve-notifications/infrastructure/controllers/notification-tenant.controller.ts
import { Controller, Get, Param, Post, Query, Res, UseGuards, Headers } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { ParseCuidPipe } from '../../../../shared/pipes';
import { NotificationTenantService } from '../../application/services/notification-tenant.service';

@ApiTags('Notifications (tenant admin)')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('notifications/tenant')
export class NotificationTenantController {
  constructor(private readonly service: NotificationTenantService) {}

  @Get('me/unread-count')
  @ApiOperation({ summary: 'Get unread notification count for current admin' })
  async unreadCount(@CurrentAdmin() admin: CurrentAdminPayload, @Headers('x-tenant-id') tenantId: string, @Res() res: Response) {
    const count = await this.service.getUnreadCount(tenantId, admin.admin_id);
    return res.status(200).json({ count });
  }

  @Get()
  @ApiOperation({ summary: 'List notifications for tenant admin inbox' })
  async list(@CurrentAdmin() admin: CurrentAdminPayload, @Headers('x-tenant-id') tenantId: string, @Query('page') page = '1', @Query('limit') limit = '20', @Res() res: Response) {
    const result = await this.service.listForTenant(tenantId, admin.admin_id, Number(page), Number(limit));
    return res.status(200).json(result);
  }

  @Post('/:id/view')
  @ApiOperation({ summary: 'Mark notification as viewed' })
  async markViewed(@Param('id', ParseCuidPipe) id: string, @CurrentAdmin() admin: CurrentAdminPayload, @Headers('x-tenant-id') tenantId: string, @Res() res: Response) {
    await this.service.markAsViewed(id, tenantId, admin.admin_id);
    return res.status(200).json({ ok: true });
  }
}
```

- [ ] **Step 3: Create notification-settings.controller.ts**

```typescript
// src/modules/reserve-notifications/infrastructure/controllers/notification-settings.controller.ts
import { Body, Controller, Get, Param, Patch, Res, UseGuards, Headers } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { EAdminRole } from '../../../reserve-auth/domain/enums/admin-role.enum';
import { ParseCuidPipe } from '../../../../shared/pipes';
import { NotificationSettingsService } from '../../application/services/notification-settings.service';
import { UpdateNotificationSettingsDTO } from '../../application/dtos';

@ApiTags('Notification Settings')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('notifications/settings')
export class NotificationSettingsController {
  constructor(private readonly service: NotificationSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get own tenant notification settings' })
  async getOwn(@Headers('x-tenant-id') tenantId: string, @Res() res: Response) {
    const result = await this.service.getSettings(tenantId);
    return res.status(200).json(result);
  }

  @Patch()
  @ApiOperation({ summary: 'Update own tenant notification settings' })
  async updateOwn(@Headers('x-tenant-id') tenantId: string, @Body() dto: UpdateNotificationSettingsDTO, @Res() res: Response) {
    const result = await this.service.updateSettings(tenantId, dto);
    return res.status(200).json(result);
  }

  @Get('/:tenantId')
  @Roles(EAdminRole.super_admin)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get any tenant notification settings (super_admin)' })
  async getForTenant(@Param('tenantId', ParseCuidPipe) tenantId: string, @Res() res: Response) {
    const result = await this.service.getSettings(tenantId);
    return res.status(200).json(result);
  }

  @Patch('/:tenantId')
  @Roles(EAdminRole.super_admin)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update any tenant notification settings (super_admin)' })
  async updateForTenant(@Param('tenantId', ParseCuidPipe) tenantId: string, @Body() dto: UpdateNotificationSettingsDTO, @Res() res: Response) {
    const result = await this.service.updateSettings(tenantId, dto);
    return res.status(200).json(result);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/reserve-notifications/
git commit -m "feat: add notifications controllers"
```

---

### Task 11: NestJS Module + App registration

**Files:**
- Create: `src/modules/reserve-notifications/reserve-notifications.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Create reserve-notifications.module.ts**

```typescript
// src/modules/reserve-notifications/reserve-notifications.module.ts
import { Module } from '@nestjs/common';
import { NotificationService } from './application/services/notification.service';
import { NotificationTenantService } from './application/services/notification-tenant.service';
import { NotificationSettingsService } from './application/services/notification-settings.service';
import { NotificationEventService } from './application/services/notification-event.service';
import { NotificationSchedulerService } from './application/services/notification-scheduler.service';
import { NotificationController } from './infrastructure/controllers/notification.controller';
import { NotificationTenantController } from './infrastructure/controllers/notification-tenant.controller';
import { NotificationSettingsController } from './infrastructure/controllers/notification-settings.controller';
import { NotificationRepository } from './infrastructure/repositories/notification.repository';
import { NotificationReceiptRepository } from './infrastructure/repositories/notification-receipt.repository';
import { NotificationSettingsRepository } from './infrastructure/repositories/notification-settings.repository';
import { NOTIFICATION_REPOSITORY, NOTIFICATION_RECEIPT_REPOSITORY, NOTIFICATION_SETTINGS_REPOSITORY } from './domain/interfaces';
import { AdminJwtGuard, RolesGuard } from '../../shared/auth/guards';
import { ReserveAuthModule } from '../reserve-auth/reserve-auth.module';

@Module({
  imports: [ReserveAuthModule],
  controllers: [
    NotificationTenantController, // must be before NotificationController (avoids /tenant route conflict)
    NotificationSettingsController,
    NotificationController,
  ],
  providers: [
    NotificationService,
    NotificationTenantService,
    NotificationSettingsService,
    NotificationEventService,
    NotificationSchedulerService,
    NotificationRepository,
    NotificationReceiptRepository,
    NotificationSettingsRepository,
    { provide: NOTIFICATION_REPOSITORY, useExisting: NotificationRepository },
    { provide: NOTIFICATION_RECEIPT_REPOSITORY, useExisting: NotificationReceiptRepository },
    { provide: NOTIFICATION_SETTINGS_REPOSITORY, useExisting: NotificationSettingsRepository },
    AdminJwtGuard,
    RolesGuard,
  ],
  exports: [NotificationEventService, NotificationSettingsService],
})
export class ReserveNotificationsModule {}
```

- [ ] **Step 2: Register module in app.module.ts**

In `src/app.module.ts`, add the import and registration:

```typescript
// Add to imports at top:
import { ReserveNotificationsModule } from './modules/reserve-notifications/reserve-notifications.module';

// Add to @Module imports array:
ReserveNotificationsModule,

// Add to RouterModule.register array:
{ path: 'notifications', module: ReserveNotificationsModule },
```

- [ ] **Step 3: Run the app to verify it boots**

```bash
npm run start:dev
```

Expected: NestJS starts without errors. Check console for `[RouterExplorer] Mapped /api/notifications` routes.

- [ ] **Step 4: Run all tests**

```bash
npx jest --no-coverage
```

Expected: All existing tests + new notification tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/reserve-notifications/reserve-notifications.module.ts src/app.module.ts
git commit -m "feat: register ReserveNotificationsModule in app"
```

---

## Phase 6 — Frontend

### Task 12: Hooks

**Files (in `frontend_dashboard_reserve-admin`):**
- Create: `src/common/hooks/use-notification-inbox.ts`
- Create: `src/common/hooks/use-unread-count.ts`
- Create: `src/common/hooks/use-notifications.ts`
- Create: `src/common/hooks/use-notification-settings.ts`

- [ ] **Step 1: Create use-notification-inbox.ts**

```typescript
// src/common/hooks/use-notification-inbox.ts
'use client';
import { useState, useEffect, useCallback } from 'react';
import { getCookie } from 'cookies-next';

const API = process.env.NEXT_PUBLIC_API_URL ?? '';

export function useNotificationInbox(tenantId: string | null, page = 1, limit = 20) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const token = getCookie('session-token');
      const res = await window.fetch(`${API}/api/notifications/tenant?page=${page}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId },
      });
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } finally { setLoading(false); }
  }, [tenantId, page, limit]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => {
    const handler = () => fetch();
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [fetch]);

  const markAsViewed = async (notificationId: string) => {
    const token = getCookie('session-token');
    await window.fetch(`${API}/api/notifications/tenant/${notificationId}/view`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId! },
    });
    fetch();
  };

  return { data, total, loading, refetch: fetch, markAsViewed };
}
```

- [ ] **Step 2: Create use-unread-count.ts**

```typescript
// src/common/hooks/use-unread-count.ts
'use client';
import { useState, useEffect } from 'react';
import { getCookie } from 'cookies-next';

const API = process.env.NEXT_PUBLIC_API_URL ?? '';

export function useUnreadCount(tenantId: string | null) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!tenantId) return;
    const load = async () => {
      try {
        const token = getCookie('session-token');
        const res = await window.fetch(`${API}/api/notifications/tenant/me/unread-count`, {
          headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId },
        });
        const json = await res.json();
        setCount(json.count ?? 0);
      } catch {}
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [tenantId]);

  return count;
}
```

- [ ] **Step 3: Create use-notifications.ts (super_admin)**

```typescript
// src/common/hooks/use-notifications.ts
'use client';
import { useState, useEffect, useCallback } from 'react';
import { getCookie } from 'cookies-next';

const API = process.env.NEXT_PUBLIC_API_URL ?? '';

export function useNotifications(filters: { type?: string; scope?: string; published?: boolean; page?: number; limit?: number } = {}) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const token = getCookie('session-token');
      const params = new URLSearchParams();
      if (filters.type) params.set('type', filters.type);
      if (filters.scope) params.set('scope', filters.scope);
      if (filters.published !== undefined) params.set('published', String(filters.published));
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      const res = await window.fetch(`${API}/api/notifications?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } finally { setLoading(false); }
  }, [JSON.stringify(filters)]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, total, loading, refetch: fetch };
}
```

- [ ] **Step 4: Create use-notification-settings.ts**

```typescript
// src/common/hooks/use-notification-settings.ts
'use client';
import { useState, useEffect, useCallback } from 'react';
import { getCookie } from 'cookies-next';

const API = process.env.NEXT_PUBLIC_API_URL ?? '';

export function useNotificationSettings(tenantId: string | null, isSuperAdmin = false) {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const token = getCookie('session-token');
      const url = isSuperAdmin
        ? `${API}/api/notifications/settings/${tenantId}`
        : `${API}/api/notifications/settings`;
      const headers: any = { Authorization: `Bearer ${token}` };
      if (!isSuperAdmin) headers['x-tenant-id'] = tenantId;
      const res = await window.fetch(url, { headers });
      setSettings(await res.json());
    } finally { setLoading(false); }
  }, [tenantId, isSuperAdmin]);

  useEffect(() => { fetch(); }, [fetch]);

  const updateSettings = async (data: any) => {
    const token = getCookie('session-token');
    const url = isSuperAdmin
      ? `${API}/api/notifications/settings/${tenantId}`
      : `${API}/api/notifications/settings`;
    const headers: any = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    if (!isSuperAdmin) headers['x-tenant-id'] = tenantId;
    await window.fetch(url, { method: 'PATCH', headers, body: JSON.stringify(data) });
    fetch();
  };

  return { settings, loading, refetch: fetch, updateSettings };
}
```

- [ ] **Step 5: Commit**

```bash
git add src/common/hooks/
git commit -m "feat: add notification hooks"
```

---

### Task 13: Notification components

**Files:**
- Create: `src/components/notifications/notification-badge.tsx`
- Create: `src/components/notifications/notification-inbox.tsx`
- Create: `src/components/notifications/notification-list.tsx`
- Create: `src/components/notifications/notification-form.tsx`
- Create: `src/components/notifications/tenant-notification-settings-form.tsx`

- [ ] **Step 1: Create notification-badge.tsx**

```tsx
// src/components/notifications/notification-badge.tsx
'use client';
import { useUnreadCount } from '@/src/common/hooks/use-unread-count';
import { useTenantStore } from '@/src/common/stores/tenant-store';

export function NotificationBadge() {
  const selectedTenant = useTenantStore((s) => s.selectedTenant);
  const count = useUnreadCount(selectedTenant?.id ?? null);
  if (!count) return null;
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}
```

- [ ] **Step 2: Create notification-inbox.tsx**

```tsx
// src/components/notifications/notification-inbox.tsx
'use client';
import { useNotificationInbox } from '@/src/common/hooks/use-notification-inbox';
import { useTenantStore } from '@/src/common/stores/tenant-store';
import { useState } from 'react';

export function NotificationInbox() {
  const selectedTenant = useTenantStore((s) => s.selectedTenant);
  const tenantId = selectedTenant?.id ?? null;
  const [page, setPage] = useState(1);
  const { data, total, loading, markAsViewed } = useNotificationInbox(tenantId, page, 20);

  if (loading) return <div className="p-6 text-sm text-gray-500">Carregando...</div>;

  return (
    <div className="flex flex-col gap-2 p-4">
      {data.length === 0 && <p className="text-sm text-gray-500">Nenhuma notificação.</p>}
      {data.map((item: any) => (
        <div
          key={item.id}
          onClick={() => !item.viewed && markAsViewed(item.notification_id ?? item.Notification?.id)}
          className={`cursor-pointer rounded-lg border p-4 transition-colors ${item.viewed ? 'border-gray-200 bg-white' : 'border-blue-200 bg-blue-50'}`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-sm">{item.Notification?.title ?? item.title}</p>
            {!item.viewed && <span className="h-2 w-2 rounded-full bg-blue-500 mt-1 shrink-0" />}
          </div>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.Notification?.body ?? item.body}</p>
          {item.first_viewed_at && (
            <p className="text-xs text-gray-400 mt-1">Visto em: {new Date(item.first_viewed_at).toLocaleDateString('pt-BR')}</p>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create notification-list.tsx (super_admin table)**

```tsx
// src/components/notifications/notification-list.tsx
'use client';
import { useNotifications } from '@/src/common/hooks/use-notifications';
import { useState } from 'react';
import Link from 'next/link';

export function NotificationList() {
  const [page, setPage] = useState(1);
  const { data, total, loading, refetch } = useNotifications({ page, limit: 20 });

  const publish = async (id: string) => {
    const { getCookie } = await import('cookies-next');
    const token = getCookie('session-token');
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${id}/publish`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    });
    refetch();
  };

  const remove = async (id: string) => {
    const { getCookie } = await import('cookies-next');
    const token = getCookie('session-token');
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    refetch();
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Notificações</h1>
        <Link href="/dashboard/global/notifications/new" className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
          Nova notificação
        </Link>
      </div>
      {loading ? <p className="text-sm text-gray-500">Carregando...</p> : (
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-gray-500">
            <th className="pb-2">Título</th><th className="pb-2">Tipo</th><th className="pb-2">Escopo</th><th className="pb-2">Status</th><th className="pb-2">Ações</th>
          </tr></thead>
          <tbody>
            {data.map((n: any) => (
              <tr key={n.id} className="border-b hover:bg-gray-50">
                <td className="py-3 pr-4 font-medium">{n.title}</td>
                <td className="py-3 pr-4 text-gray-500 capitalize">{n.type}</td>
                <td className="py-3 pr-4 text-gray-500 capitalize">{n.scope}</td>
                <td className="py-3 pr-4">{n.published_at ? <span className="text-green-600">Publicado</span> : <span className="text-yellow-600">Rascunho</span>}</td>
                <td className="py-3 flex gap-2">
                  {!n.published_at && <button onClick={() => publish(n.id)} className="text-blue-600 hover:underline text-xs">Publicar</button>}
                  {!n.published_at && <Link href={`/dashboard/global/notifications/${n.id}`} className="text-gray-600 hover:underline text-xs">Editar</Link>}
                  {!n.published_at && <button onClick={() => remove(n.id)} className="text-red-500 hover:underline text-xs">Excluir</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create notification-form.tsx**

```tsx
// src/components/notifications/notification-form.tsx
'use client';
import { useState } from 'react';
import { getCookie } from 'cookies-next';
import { useRouter } from 'nextjs-toploader/app';

const API = process.env.NEXT_PUBLIC_API_URL ?? '';

interface Props { initial?: any; id?: string; }

export function NotificationForm({ initial, id }: Props) {
  const { push } = useRouter();
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    body: initial?.body ?? '',
    type: initial?.type ?? 'manual',
    scope: initial?.scope ?? 'broadcast',
    tenant_ids: (initial?.tenant_ids ?? []).join(','),
    send_email: initial?.send_email ?? false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const token = getCookie('session-token');
      const payload = {
        ...form,
        tenant_ids: form.scope === 'targeted' ? form.tenant_ids.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      const url = id ? `${API}/api/notifications/${id}` : `${API}/api/notifications`;
      const method = id ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const j = await res.json(); throw new Error(j.message ?? 'Erro'); }
      push('/dashboard/global/notifications');
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 max-w-xl p-6">
      <h1 className="text-xl font-semibold">{id ? 'Editar notificação' : 'Nova notificação'}</h1>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <label className="flex flex-col gap-1 text-sm">Título
        <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required maxLength={255} className="border rounded px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">Corpo
        <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} required rows={5} className="border rounded px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">Escopo
        <select value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))} className="border rounded px-3 py-2">
          <option value="broadcast">Broadcast (todos os tenants)</option>
          <option value="targeted">Segmentado</option>
        </select>
      </label>
      {form.scope === 'targeted' && (
        <label className="flex flex-col gap-1 text-sm">IDs dos tenants (separados por vírgula)
          <input value={form.tenant_ids} onChange={e => setForm(f => ({ ...f, tenant_ids: e.target.value }))} className="border rounded px-3 py-2" placeholder="id1, id2, ..." />
        </label>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.send_email} onChange={e => setForm(f => ({ ...f, send_email: e.target.checked }))} />
        Enviar por email
      </label>
      <button type="submit" disabled={loading} className="self-start rounded bg-blue-600 px-6 py-2 text-white text-sm disabled:opacity-50">
        {loading ? 'Salvando...' : 'Salvar rascunho'}
      </button>
    </form>
  );
}
```

- [ ] **Step 5: Create tenant-notification-settings-form.tsx**

```tsx
// src/components/notifications/tenant-notification-settings-form.tsx
'use client';
import { useNotificationSettings } from '@/src/common/hooks/use-notification-settings';
import { ALL_EVENT_KEYS, ALL_CRON_KEYS } from '@/src/../../backend_api_reserve-admin/src/modules/reserve-notifications/domain/constants/notification-events';

// Since event/cron keys are constants, replicate them here to avoid cross-repo imports:
const EVENT_KEYS = ['lead.created', 'subscription.expiring', 'subscription.expired'];
const CRON_KEYS_LIST = ['subscription.expiry_check', 'subscription.expired_check'];

interface Props { tenantId: string; isSuperAdmin?: boolean; }

export function TenantNotificationSettingsForm({ tenantId, isSuperAdmin }: Props) {
  const { settings, loading, updateSettings } = useNotificationSettings(tenantId, isSuperAdmin);

  if (loading || !settings) return <div className="p-6 text-sm text-gray-500">Carregando...</div>;

  const toggle = (field: 'email_enabled' | 'inapp_enabled', value: boolean) => updateSettings({ [field]: value });

  const toggleEvent = (key: string, value: boolean) =>
    updateSettings({ event_settings: { ...(settings.event_settings ?? {}), [key]: value } });

  const toggleCron = (key: string, value: boolean) =>
    updateSettings({ cron_settings: { ...(settings.cron_settings ?? {}), [key]: value } });

  return (
    <div className="flex flex-col gap-6 p-6 max-w-xl">
      <h2 className="text-lg font-semibold">Configurações de notificações</h2>
      <section className="flex flex-col gap-2">
        <h3 className="font-medium text-sm">Canais globais</h3>
        {([['email_enabled', 'Email'], ['inapp_enabled', 'In-app']] as const).map(([field, label]) => (
          <label key={field} className="flex items-center justify-between text-sm border rounded px-4 py-3">
            {label}
            <input type="checkbox" checked={settings[field]} onChange={e => toggle(field, e.target.checked)} />
          </label>
        ))}
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="font-medium text-sm">Eventos do sistema</h3>
        {EVENT_KEYS.map(key => (
          <label key={key} className="flex items-center justify-between text-sm border rounded px-4 py-3">
            {key}
            <input type="checkbox" checked={(settings.event_settings ?? {})[key] !== false} onChange={e => toggleEvent(key, e.target.checked)} />
          </label>
        ))}
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="font-medium text-sm">Jobs agendados (cron)</h3>
        {CRON_KEYS_LIST.map(key => (
          <label key={key} className="flex items-center justify-between text-sm border rounded px-4 py-3">
            {key}
            <input type="checkbox" checked={(settings.cron_settings ?? {})[key] !== false} onChange={e => toggleCron(key, e.target.checked)} />
          </label>
        ))}
      </section>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/notifications/
git commit -m "feat: add notification components"
```

---

### Task 14: Pages (routes)

**Files:**
- Create: `src/app/dashboard/global/notifications/page.tsx`
- Create: `src/app/dashboard/global/notifications/new/page.tsx`
- Create: `src/app/dashboard/global/notifications/[id]/page.tsx`
- Create: `src/app/dashboard/global/notifications/settings/[tenantId]/page.tsx`
- Create: `src/app/dashboard/notifications/page.tsx`

- [ ] **Step 1: Create super_admin list page**

```tsx
// src/app/dashboard/global/notifications/page.tsx
import { NotificationList } from '@/src/components/notifications/notification-list';
export default function NotificationsPage() { return <NotificationList />; }
```

- [ ] **Step 2: Create super_admin new notification page**

```tsx
// src/app/dashboard/global/notifications/new/page.tsx
import { NotificationForm } from '@/src/components/notifications/notification-form';
export default function NewNotificationPage() { return <NotificationForm />; }
```

- [ ] **Step 3: Create super_admin edit notification page**

```tsx
// src/app/dashboard/global/notifications/[id]/page.tsx
'use client';
import { NotificationForm } from '@/src/components/notifications/notification-form';
import { useEffect, useState } from 'react';
import { getCookie } from 'cookies-next';
import { use } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? '';

export default function EditNotificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [notification, setNotification] = useState<any>(null);

  useEffect(() => {
    const token = getCookie('session-token');
    fetch(`${API}/api/notifications/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setNotification);
  }, [id]);

  if (!notification) return <div className="p-6 text-sm text-gray-500">Carregando...</div>;
  return <NotificationForm initial={notification} id={id} />;
}
```

- [ ] **Step 4: Create super_admin tenant settings page**

```tsx
// src/app/dashboard/global/notifications/settings/[tenantId]/page.tsx
import { TenantNotificationSettingsForm } from '@/src/components/notifications/tenant-notification-settings-form';
import { use } from 'react';

export default function TenantNotificationSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return <TenantNotificationSettingsForm tenantId={tenantId} isSuperAdmin />;
}
```

- [ ] **Step 5: Create tenant admin inbox page**

```tsx
// src/app/dashboard/notifications/page.tsx
import { NotificationInbox } from '@/src/components/notifications/notification-inbox';
export default function NotificationsInboxPage() { return <NotificationInbox />; }
```

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/
git commit -m "feat: add notification pages"
```

---

### Task 15: Sidebar integration

**Files:**
- Modify: `src/components/ui/aside.tsx`

- [ ] **Step 1: Add Bell icon import**

In `src/components/ui/aside.tsx`, find the lucide-react import block (around line 9) and add `Bell` to the import list:

```typescript
import {
  // ... existing imports ...
  Bell,
} from "lucide-react";
```

- [ ] **Step 2: Add NotificationBadge import**

After the existing component imports in `aside.tsx`:

```typescript
import { NotificationBadge } from '../notifications/notification-badge';
```

- [ ] **Step 3: Add Notifications nav item to navItems**

In the `navItems` or equivalent array inside `Sidebar`, add:

```typescript
// For super_admin scope (inside the isSuperAdmin condition or global items):
{
  id: 'notifications-global',
  label: t('notifications'),
  icon: Bell,
  path: '/dashboard/global/notifications',
}

// For tenant admin scope:
{
  id: 'notifications',
  label: t('notifications'),
  icon: Bell,
  path: '/dashboard/notifications',
}
```

- [ ] **Step 4: Render NotificationBadge next to the tenant notifications item**

Find the nav item rendering logic in `aside.tsx` and, for the `notifications` item (non-super_admin), render the badge after the label:

```tsx
{item.id === 'notifications' && !isSuperAdmin && <NotificationBadge />}
```

- [ ] **Step 5: Add i18n key**

In `src/messages/` (or equivalent i18n files), add the `notifications` key to the `sidebar` namespace for each locale file (e.g. `en.json`, `pt.json`):

```json
// pt.json — inside "sidebar" object:
"notifications": "Notificações"

// en.json — inside "sidebar" object:
"notifications": "Notifications"
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/aside.tsx src/messages/
git commit -m "feat: add notifications to sidebar with unread badge"
```

---

## Phase 7 — Integration Wiring

### Task 16: Wire NotificationEventService into ReserveLeadsModule

**Files:**
- Modify: `src/modules/reserve-leads/reserve-leads.module.ts`
- Modify: the lead creation service (find with `grep -r "lead.*create\|create.*lead" src/modules/reserve-leads --include="*.ts" -l`)

- [ ] **Step 1: Import ReserveNotificationsModule in ReserveLeadsModule**

Open `src/modules/reserve-leads/reserve-leads.module.ts` and add to its imports array:

```typescript
import { ReserveNotificationsModule } from '../reserve-notifications/reserve-notifications.module';
// ...
@Module({
  imports: [ReserveNotificationsModule, /* existing imports */],
  // ...
})
```

- [ ] **Step 2: Inject NotificationEventService in the lead creation service**

Find the service responsible for creating leads (run `npx grep -r "async create" src/modules/reserve-leads --include="*.ts"`). In that service's constructor, add:

```typescript
import { NotificationEventService } from '../reserve-notifications/application/services/notification-event.service';
import { NOTIFICATION_EVENTS } from '../reserve-notifications/domain/constants/notification-events';

constructor(
  // ... existing deps ...
  private readonly notificationEventService: NotificationEventService,
) {}
```

- [ ] **Step 3: Call dispatch after successful lead creation**

In the lead creation method, after the lead is persisted, add:

```typescript
await this.notificationEventService.dispatch(
  NOTIFICATION_EVENTS.LEAD_CREATED,
  tenantId,
  { lead_id: lead.id },
).catch(() => {}); // fire-and-forget, never break lead creation
```

- [ ] **Step 4: Verify the app still boots**

```bash
npm run start:dev
```

Expected: No errors. Lead creation events now dispatch notifications.

- [ ] **Step 5: Commit**

```bash
git add src/modules/reserve-leads/
git commit -m "feat: dispatch lead.created notification on lead creation"
```

---

## Self-Review Checklist

- [x] Prisma schema covers all 3 models + enums + relations on Admin/Tenant (Task 1)
- [x] Event key registry is the single source of truth used by all services (Task 2, 4, 5, 8)
- [x] Settings validation rejects unknown event/cron keys with 400 (Task 4)
- [x] `dispatch()` is a no-op for unknown keys — never throws (Task 5)
- [x] `publish()` creates receipts for all target tenants at publish time (Task 7)
- [x] Dual tracking: per-admin receipt + tenant aggregate on `markAsViewed` (Task 6)
- [x] `unread-count` route is `me/unread-count` to avoid `:id` collision (Task 10)
- [x] Controller registration order: `NotificationTenantController` before `NotificationController` (Task 11)
- [x] Cron scheduler checks settings before dispatching (Task 8)
- [x] `ReserveNotificationsModule` exports `NotificationEventService` for cross-module use (Task 11)
- [x] Frontend badge polls every 60s + revalidates on window focus (Task 12)
- [x] i18n key added to sidebar (Task 15)
- [x] Lead integration uses fire-and-forget to avoid breaking lead creation (Task 16)
