# Notification Dispatch & Email — Design Spec

**Date:** 2026-05-26  
**Status:** Approved

## Problem

The current `NotificationEventService.dispatch` creates `TenantNotificationReceipt` records with `admin_id: null`. The inbox (`findForTenant`) filters by `admin_id`, so no admin ever sees event-triggered notifications. Additionally, `send_email` is hardcoded to `false` — no emails are ever sent.

## Goals

1. Fix receipts so each targeted admin gets an individual receipt.
2. Allow callers to specify which admin roles receive a notification.
3. Support optional email delivery to those same admins.
4. Support an optional `contact_email` per tenant that receives email for configured events.

## Schema Changes

### `TenantNotificationSettings`

Add two fields:

```prisma
contact_email        String?
contact_email_events Json    @default("[]")
```

`contact_email_events`: JSON array of `NotificationEventKey` strings. Empty array (`[]`) means the contact email receives **all** events. Non-empty array acts as an allowlist.

## Shared Provider

Move `SesEmailProvider` from `zarp-licensefix/infrastructure/providers/ses-email.provider.ts` to `shared/providers/ses-email.provider.ts`.

Update the import in `ZarpLicensefixModule` and its consumers accordingly.

The provider interface stays unchanged:

```ts
interface ISendEmailOptions {
  to: string;
  subject: string;
  html: string;
}
```

Uses env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`.

## Dispatch Interface

```ts
// New type — lives in zarp-notifications/domain/interfaces or constants
interface INotificationTarget {
  roles: EAdminRole[];
  includeContactEmail: boolean;
}

// Updated signature
dispatch(
  eventKey: NotificationEventKey,
  tenantId: string,
  target: INotificationTarget,
  metadata?: Record<string, any>,
): Promise<void>
```

`target` is required — each caller explicitly declares who receives the notification.

## Dispatch Flow

```
dispatch(eventKey, tenantId, target, metadata?)
  │
  ├─ 1. Check isEventEnabled(tenantId, eventKey) → return early if disabled
  │
  ├─ 2. Resolve admins: AdminTenant WHERE tenant_id = tenantId AND active = true AND role IN target.roles
  │
  ├─ 3. Create Notification record (send_email remains a DB field; set true if email_enabled)
  │
  ├─ 4. Create TenantNotificationReceipt per admin_id
  │      → replace createManyForTenant(notifId, tenantIds) with createForAdmins(notifId, tenantId, adminIds)
  │      → new INotificationReceiptRepository method: createForAdmins(notifId: string, tenantId: string, adminIds: string[])
  │
  ├─ 5. [if settings.email_enabled]
  │      → send email to each resolved admin (admin.email)
  │
  └─ 6. [if target.includeContactEmail AND settings.contact_email is set]
         → check contact_email_events: if [] OR eventKey IN contact_email_events
         → send email to settings.contact_email
         
  Steps 5 and 6 run in Promise.all
```

## Callers to Update

| Caller | File | Change |
|--------|------|--------|
| `lead.created` | `zarp-leads` dispatch call | Add `target: { roles: [company_admin, owner], includeContactEmail: true }` |
| `subscription.expiring` | `NotificationSchedulerService.checkExpiringSubscriptions` | Add `target: { roles: [company_admin, owner], includeContactEmail: true }` |
| `subscription.expired` | `NotificationSchedulerService.checkExpiredSubscriptions` | Add `target: { roles: [company_admin, owner], includeContactEmail: true }` |

## Module Changes

`ZarpNotificationsModule`:
- Add `SesEmailProvider` to `providers`
- Inject `SesEmailProvider` in `NotificationEventService`

`ZarpLicensefixModule`:
- Update `SesEmailProvider` import path to `shared/providers/ses-email.provider`

## Out of Scope

- HTML email templates (plain `<p>${body}</p>` for now)
- Per-admin email preferences
- Unsubscribe mechanism
