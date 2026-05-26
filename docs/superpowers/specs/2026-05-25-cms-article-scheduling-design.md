# CMS Article Scheduling — Design Spec

**Date:** 2026-05-25  
**Module:** `zarp-cms`  
**Status:** Approved

---

## Overview

Adds scheduled publication support to the CMS article CRUD. Admins can set a future timestamp for automatic publication, and can edit `publishedAt` on already-published articles (correcting past dates or rescheduling to the future). Similar in behavior to WordPress scheduled posts.

---

## Requirements Summary

- An article can be scheduled for future publication with a specific date+time timestamp
- A background cron job automatically publishes scheduled articles when their time arrives (±1 minute precision)
- A published article's `publishedAt` can be edited retroactively (past date) or rescheduled to the future (article goes back to `scheduled` status and is removed from public API)
- Automatic publication does not update `lastEditedBy` — it is not considered a human edit

---

## Domain Changes

### EArticleStatus enum

Adds `scheduled` between `draft` and `published`:

```ts
export enum EArticleStatus {
  draft = 'draft',
  scheduled = 'scheduled',  // new
  published = 'published',
  archived = 'archived',
}
```

### Article entity

New field:

```ts
public scheduledAt: Date | null;
```

New method `schedule(scheduledAt: Date): void`:
- Calls `canPublish()` — throws if required fields are missing
- Throws if `scheduledAt` is not in the future
- Sets `status = scheduled`, `scheduledAt = scheduledAt`, `publishedAt = null`

New method `updatePublishedAt(newDate: Date): void`:
- Only valid when `status === published` or `status === scheduled`
- If `newDate` is in the future: sets `status = scheduled`, `scheduledAt = newDate`, `publishedAt = null`
- If `newDate` is in the past or now: sets `status = published`, `publishedAt = newDate`, `scheduledAt = null`

Existing `publish()` method is unchanged — sets `status = published`, `publishedAt = new Date()`.

---

## Database (Prisma)

New nullable column on the `Article` table:

```prisma
scheduled_at   DateTime?
```

Enum migration to include `scheduled` in the `ArticleStatus` enum (or string column — depends on current Prisma schema).

One migration file: `add_scheduled_at_and_status_to_article`.

---

## Application Layer

### DTOs

**`PublishArticleDTO`** (updated):
```ts
class PublishArticleDTO {
  scheduledAt?: Date  // ISO 8601, optional
}
```

**`UpdatePublishedAtDTO`** (new):
```ts
class UpdatePublishedAtDTO {
  publishedAt: Date  // ISO 8601, required
}
```

### ArticleService

**`publishArticle(id, currentAdminId, dto?)`** (updated):
- If `dto.scheduledAt` is present and in the future → calls `article.schedule(dto.scheduledAt)`, persists with `status = scheduled`, `scheduledAt`
- Otherwise → existing immediate publish logic unchanged

**`scheduleArticle(id, scheduledAt, currentAdminId)`** (internal helper, called by `publishArticle`):
- Finds article, validates blog exists
- Calls `article.schedule(scheduledAt)`
- Persists via `articleRepository.update()`

**`updatePublishedAt(id, newDate, currentAdminId)`** (new):
- Finds article
- Article must be `published` or `scheduled` — returns `409` otherwise
- Calls `article.updatePublishedAt(newDate)`
- Persists updated `status`, `publishedAt`, `scheduledAt`
- Does NOT update `lastEditedBy`

**`publishScheduledArticles()`** (new, called by cron):
- Calls `articleRepository.findScheduledDue()`
- For each article: sets `status = published`, `publishedAt = article.scheduledAt`, `scheduledAt = null`
- Persists via `articleRepository.update()`
- Does NOT update `lastEditedBy`
- Errors per-article are caught and logged; does not abort the batch

---

## Repository Layer

### IArticleRepository

New method:

```ts
findScheduledDue(): Promise<Article[]>
// Finds all articles WHERE status = 'scheduled' AND scheduled_at <= NOW()
```

### PrismaArticleRepository

Implements `findScheduledDue()`:
```ts
await this.prisma.article.findMany({
  where: {
    status: 'scheduled',
    scheduled_at: { lte: new Date() },
  },
})
```

`update()` already handles `scheduledAt` via the existing `if (data.scheduledAt !== undefined)` pattern — needs the mapping added.

---

## Controller Layer

### ArticleController

**`POST /articles/:id/publish`** (updated):
- Accepts optional body `PublishArticleDTO { scheduledAt?: Date }`
- Delegates to `articleService.publishArticle(id, admin.id, dto)`

**`PATCH /articles/:id/published-at`** (new):
- Role: `editor`
- Body: `UpdatePublishedAtDTO { publishedAt: Date }`
- Delegates to `articleService.updatePublishedAt(id, dto.publishedAt, admin.id)`
- Returns updated article via `ArticlePresenter`

---

## Scheduler

### ArticleSchedulerService

New service in the `zarp-cms` module:

```ts
@Injectable()
export class ArticleSchedulerService {
  constructor(private readonly articleService: ArticleService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async publishScheduledArticles(): Promise<void> {
    await this.articleService.publishScheduledArticles();
  }
}
```

### Module registration

`ZarpCmsModule` imports `ScheduleModule.forRoot()` (already available via `@nestjs/schedule` in `package.json`).  
`ArticleSchedulerService` is added to the module's `providers` array.

`AppModule` or the root module must also have `ScheduleModule.forRoot()` — verify it is not already registered globally to avoid double registration.

---

## Public API Behavior

- `findPublishedByBlogId` and `findPublishedBySlug` filter by `status = published` only — no change needed
- Scheduled articles are invisible to the public API automatically
- If an article is rescheduled to the future via `PATCH /published-at`, it disappears from the public API immediately (status becomes `scheduled`)

---

## Error Cases

| Scenario | HTTP |
|----------|------|
| `scheduledAt` in the past on publish | 400 |
| `publishedAt` update on `draft` or `archived` article | 409 |
| Article missing required fields when scheduling | 400 |
| Article not found | 404 |

---

## Out of Scope

- Notifications/webhooks when a scheduled article is published
- UI for the admin panel (frontend implementation)
- Cancelling a scheduled article (use existing `draft` transition or `delete`)
