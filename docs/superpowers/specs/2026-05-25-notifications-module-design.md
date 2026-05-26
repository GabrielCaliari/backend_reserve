# Notifications Module — Design Spec
**Date:** 2026-05-25  
**Status:** Approved  
**Repos:** `backend_api_reserve-admin`, `frontend_dashboard_reserve-admin`

---

## Overview

The Notifications module is the communication layer between the Reserve platform and its tenants. It supports two origins:

1. **Manual notifications** — created by `super_admin` via the dashboard, targeting one or all tenants
2. **System notifications** — generated automatically by internal events (e.g. lead created) or cron jobs (e.g. subscription expiring)

Both origins share the same delivery mechanism: in-app inbox and optional email via `reserve-mailer`.

---

## Actors and Permissions

| Actor | Capabilities |
|---|---|
| `super_admin` | Full CRUD on notifications; read/write settings for any tenant |
| Tenant admin (`owner`, `manager`, etc.) | Read-only inbox for their tenant; mark as viewed; update their own settings |
| System (internal services, crons) | Dispatch event notifications via `NotificationEventService` |

---

## Data Models (Prisma)

### `Notification`

Represents a notification created by the super_admin or the system.

```prisma
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
  Admin        Admin?              @relation(fields: [created_by], references: [id])
  Receipts     TenantNotificationReceipt[]

  @@index([type, scope, published_at])
  @@index([created_by])
  @@map("notifications")
}
```

**Field semantics:**
- `scope: broadcast` → `tenant_ids` is empty; all active tenants receive it
- `scope: targeted` → `tenant_ids` lists exactly which tenants receive it
- `event_key` → set only for `type: event` or `type: scheduled`; identifies the event kind (e.g. `lead.created`)
- `published_at: null` → draft; not yet delivered
- `created_by: null` → system-generated

---

### `TenantNotificationReceipt`

Tracks read state per admin (individual) and per tenant (aggregate).

```prisma
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
  Admin           Admin?       @relation(fields: [admin_id], references: [id])

  @@unique([notification_id, tenant_id, admin_id])
  @@index([tenant_id, viewed])
  @@index([admin_id, viewed])
  @@map("tenant_notification_receipts")
}
```

**Dual tracking pattern:**
- `(notification_id, tenant_id, admin_id: null)` → aggregate tenant record
- `(notification_id, tenant_id, admin_id: "xyz")` → individual admin record

When any admin marks a notification as viewed, the system updates both their individual receipt and the tenant aggregate receipt (`admin_id: null`).

---

### `TenantNotificationSettings`

Per-tenant configuration for notification channels and event/cron toggles.

```prisma
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

**JSON shape for `event_settings`:**
```json
{
  "lead.created": true,
  "subscription.expiring": true,
  "subscription.expired": true
}
```

**JSON shape for `cron_settings`:**
```json
{
  "subscription.expiry_check": true
}
```

Settings are lazily initialized with all keys defaulting to `true` on first access. New event types are added by extending the constants — no schema migration needed.

---

### Enums

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
```

---

### Tenant relation additions

Add to existing `Tenant` model:
```prisma
NotificationReceipts      TenantNotificationReceipt[]
NotificationSettings      TenantNotificationSettings?
```

Add to existing `Admin` model:
```prisma
NotificationsCreated      Notification[]
NotificationReceipts      TenantNotificationReceipt[]
```

---

## Backend — Module: `reserve-notifications`

### Directory Structure

```
src/modules/reserve-notifications/
  domain/
    entities/
      notification.entity.ts
    enums/
      notification-type.enum.ts
      notification-scope.enum.ts
    interfaces/
      notification.repository.interface.ts
      notification-settings.repository.interface.ts
      notification-receipt.repository.interface.ts
    constants/
      notification-events.ts      ← typed event key registry
  application/
    dtos/
      create-notification.dto.ts
      update-notification.dto.ts
      update-notification-settings.dto.ts
      list-notifications-query.dto.ts
    services/
      notification.service.ts
      notification-tenant.service.ts
      notification-settings.service.ts
      notification-event.service.ts
      notification-scheduler.service.ts
  infrastructure/
    controllers/
      notification.controller.ts          ← super_admin
      notification-tenant.controller.ts   ← tenant admin
      notification-settings.controller.ts ← both roles
    repositories/
      notification.repository.ts
      notification-settings.repository.ts
      notification-receipt.repository.ts
  reserve-notifications.module.ts
```

---

### Event Key Registry

`domain/constants/notification-events.ts` — single source of truth:

```typescript
export const NOTIFICATION_EVENTS = {
  LEAD_CREATED:             'lead.created',
  SUBSCRIPTION_EXPIRING:    'subscription.expiring',
  SUBSCRIPTION_EXPIRED:     'subscription.expired',
} as const;

export type NotificationEventKey = typeof NOTIFICATION_EVENTS[keyof typeof NOTIFICATION_EVENTS];
```

---

### Services

#### `NotificationService` — super_admin operations
- `create(dto, adminId)` — creates notification (draft); resolves target tenants from scope; does not deliver yet
- `publish(id)` — sets `published_at`; creates tenant receipts for all target tenants; triggers email delivery (via `reserve-mailer`) only if `send_email: true` **and** `TenantNotificationSettings.email_enabled` is `true` for each target tenant at publish time
- `update(id, dto)` — edit drafts only
- `delete(id)` — remove drafts only
- `list(filters, pagination)` — paginated list with type/scope/status filters
- `findById(id)`

#### `NotificationTenantService` — tenant admin operations
- `listForTenant(tenantId, adminId, pagination)` — returns notifications with per-admin read state
- `markAsViewed(notificationId, tenantId, adminId)` — upserts individual receipt; updates tenant aggregate receipt
- `getUnreadCount(tenantId, adminId)` — count of unread receipts for badge

#### `NotificationSettingsService` — both roles
- `getSettings(tenantId)` — returns settings, lazily creating defaults if none exist
- `updateSettings(tenantId, dto)` — validates event/cron keys against registry before saving

#### `NotificationEventService` — internal dispatch
- `dispatch(eventKey, tenantId, metadata?)` — checks tenant settings; if enabled, creates and publishes a notification of `type: event`; sends email if `email_enabled` in settings

#### `NotificationSchedulerService` — cron jobs
- `checkExpiringSubscriptions()` — `@Cron('0 9 * * *')` — finds tenants with subscriptions expiring in 7 days; calls `dispatch('subscription.expiring', tenantId)`
- `checkExpiredSubscriptions()` — `@Cron('0 10 * * *')` — finds tenants with subscriptions that expired; calls `dispatch('subscription.expired', tenantId)`
- Each cron checks `cron_settings` before dispatching

---

### API Endpoints

#### Super_admin — `AdminJwtGuard + Roles(super_admin)`

| Method | Path | Description |
|---|---|---|
| POST | `/notifications` | Create manual notification (draft) |
| POST | `/notifications/:id/publish` | Publish draft |
| GET | `/notifications` | List all notifications (paginated) |
| GET | `/notifications/:id` | Get notification detail |
| PATCH | `/notifications/:id` | Update draft |
| DELETE | `/notifications/:id` | Delete draft |

#### Tenant admin — `AdminJwtGuard`

| Method | Path | Description |
|---|---|---|
| GET | `/notifications/tenant` | List tenant inbox with read state |
| GET | `/notifications/tenant/me/unread-count` | Badge count |
| POST | `/notifications/tenant/:id/view` | Mark as viewed |

#### Settings — `AdminJwtGuard`

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/notifications/settings` | any admin | Read own tenant settings |
| PATCH | `/notifications/settings` | any admin | Update own tenant settings |
| GET | `/notifications/settings/:tenantId` | super_admin | Read any tenant settings |
| PATCH | `/notifications/settings/:tenantId` | super_admin | Update any tenant settings |

---

### Integration with Other Modules

Other modules inject `NotificationEventService` and call `dispatch()`:

```typescript
// Example in LeadService
await this.notificationEventService.dispatch(
  NOTIFICATION_EVENTS.LEAD_CREATED,
  tenantId,
  { lead_id: lead.id }
);
```

The caller does not need to check settings — `NotificationEventService.dispatch()` handles that internally.

---

## Frontend — `frontend_dashboard_reserve-admin`

### Routes

**Super_admin:**
```
/dashboard/global/notifications                      list + actions
/dashboard/global/notifications/new                  create form
/dashboard/global/notifications/[id]                 detail / edit draft
/dashboard/global/notifications/settings/[tenantId]  tenant settings form
```

**Tenant admin:**
```
/dashboard/notifications                             inbox
```

---

### Components

| Component | Location | Description |
|---|---|---|
| `NotificationList` | `components/notifications/` | Paginated table: title, type, scope, status, date, actions |
| `NotificationForm` | `components/notifications/` | Create/edit: title, body, scope toggle, tenant multi-select (if targeted), send_email toggle, schedule datetime |
| `TenantNotificationSettingsForm` | `components/notifications/` | Global toggles (email, in-app) + per-event and per-cron toggle list |
| `NotificationInbox` | `components/notifications/` | Inbox list with unread badge, click-to-view |
| `NotificationDetail` | `components/notifications/` | Full content + first_viewed_at, last_viewed_at metadata |
| `NotificationBadge` | `components/ui/` | Unread count badge, used in sidebar |

---

### Hooks

- `useNotifications()` — super_admin: fetches paginated notification list
- `useNotificationInbox(tenantId)` — tenant admin: inbox + unread count, revalidates on window focus
- `useNotificationSettings(tenantId)` — settings for a tenant
- `useUnreadCount(tenantId)` — lightweight hook for sidebar badge (polls every 60s)

---

### Sidebar Integration

In `components/ui/aside.tsx`, add a Notifications nav item:
- Super_admin: links to `/dashboard/global/notifications`
- Tenant admin: links to `/dashboard/notifications` with `NotificationBadge`
- Visibility controlled by existing `usePermissions()` / `isSuperAdmin` pattern

---

## Error Handling

- Publishing a non-existent or already-published notification → 409 Conflict
- Marking viewed for a notification not addressed to the tenant → 403 Forbidden
- `dispatch()` with an unknown event key → logs a warning, no-ops silently (does not throw, to avoid breaking callers)
- Settings update with unknown event/cron key → 400 Bad Request (validated against registry)

---

## Out of Scope

- Push notifications (mobile / web push)
- Notification templates with variable substitution (body is plain text/HTML authored by super_admin)
- Tenant-to-customer notifications (tenants notifying their end users)
- Read receipts per email delivery (email open tracking uses existing `reserve-mailer` delivery model)
