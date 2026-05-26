# CMS Article Scheduling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add scheduled publication support to CMS articles — admins can schedule a future publish time, the cron auto-publishes at that time, and published articles' `publishedAt` can be edited retroactively or rescheduled to the future.

**Architecture:** New `scheduled` status in the enum; `scheduledAt` field on the Article entity/table; `publishArticle` endpoint updated to accept an optional future timestamp; new `PATCH /articles/:id/published-at` endpoint; `ArticleSchedulerService` with a `@Cron(EVERY_MINUTE)` polls for due articles and publishes them. `ScheduleModule.forRoot()` is already registered in `AppModule`.

**Tech Stack:** NestJS, Prisma (PostgreSQL), `@nestjs/schedule` (already installed), Jest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/modules/reserve-cms/domain/enums/article-status.enum.ts` | Modify | Add `scheduled` value |
| `src/modules/reserve-cms/domain/entities/article.entity.ts` | Modify | Add `scheduledAt` field, `schedule()`, `updatePublishedAt()` methods |
| `src/modules/reserve-cms/domain/entities/article.entity.spec.ts` | Create | Unit tests for new entity methods |
| `src/modules/reserve-cms/domain/interfaces/article.repository.interface.ts` | Modify | Add `findScheduledDue()` to interface |
| `src/modules/reserve-cms/application/dtos/publish-article.dto.ts` | Modify | Add optional `scheduledAt: Date` field |
| `src/modules/reserve-cms/application/dtos/update-published-at.dto.ts` | Create | `publishedAt: Date` required field |
| `src/modules/reserve-cms/application/dtos/index.ts` | Modify | Export new DTO |
| `src/modules/reserve-cms/application/services/article.service.ts` | Modify | Update `publishArticle()`, add `updatePublishedAt()`, add `publishScheduledArticles()` |
| `src/modules/reserve-cms/application/services/article.service.spec.ts` | Modify | Tests for new service methods |
| `src/modules/reserve-cms/application/services/article-scheduler.service.ts` | Create | `@Cron(EVERY_MINUTE)` cron service |
| `src/modules/reserve-cms/infrastructure/repositories/prisma-article.repository.ts` | Modify | Add `findScheduledDue()`, map `scheduledAt` in `update()` and `toDomain()` |
| `src/modules/reserve-cms/infrastructure/controllers/article.controller.ts` | Modify | Update `publish` endpoint body, add `PATCH /:id/published-at` |
| `src/modules/reserve-cms/infrastructure/presenters/article.presenter.ts` | Modify | Expose `scheduled_at` in response |
| `src/modules/reserve-cms/reserve-cms.module.ts` | Modify | Register `ArticleSchedulerService` |
| `prisma/schema.prisma` | Modify | Add `scheduled_at DateTime?` and `scheduled` to enum |
| `prisma/migrations/` | Create | Migration file via `npx prisma migrate dev` |

---

## Task 1: Add `scheduled` to EArticleStatus enum

**Files:**
- Modify: `src/modules/reserve-cms/domain/enums/article-status.enum.ts`

- [ ] **Step 1: Update the enum**

Replace the entire file content:

```ts
export enum EArticleStatus {
  draft = 'draft',
  scheduled = 'scheduled',
  published = 'published',
  archived = 'archived',
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `EArticleStatus` (there may be other unrelated errors — ignore those).

- [ ] **Step 3: Commit**

```bash
git add src/modules/reserve-cms/domain/enums/article-status.enum.ts
git commit -m "feat(cms): add scheduled status to EArticleStatus enum"
```

---

## Task 2: Update Prisma schema and create migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: migration via `npx prisma migrate dev`

- [ ] **Step 1: Add `scheduled` to the Prisma enum and `scheduled_at` column**

In `prisma/schema.prisma`, find the `EArticleStatus` enum (currently around line 1647) and update it:

```prisma
enum EArticleStatus {
  draft
  scheduled
  published
  archived
}
```

Then in the `Article` model, add `scheduled_at` after `published_at`:

```prisma
model Article {
  // ... existing fields ...
  published_at      DateTime?
  scheduled_at      DateTime?          // new
  // ... rest of fields ...
}
```

Also add `scheduled_at` to the existing composite index for better query performance:

```prisma
@@index([blog_id, status, published_at])
@@index([status, scheduled_at])          // new index for cron query
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_scheduled_status_and_scheduled_at
```

Expected output: `✔ Generated Prisma Client` and migration applied successfully.

- [ ] **Step 3: Verify generated client has the new field**

```bash
grep -n "scheduled" src/generated/prisma/client/index.d.ts | head -10
```

Expected: Lines showing `scheduled` in the enum and `scheduled_at` as an optional field.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(cms): add scheduled_at column and scheduled enum value to Article"
```

---

## Task 3: Update Article entity — add `scheduledAt` field and new methods

**Files:**
- Modify: `src/modules/reserve-cms/domain/entities/article.entity.ts`
- Create: `src/modules/reserve-cms/domain/entities/article.entity.spec.ts`

- [ ] **Step 1: Write failing tests first**

Create `src/modules/reserve-cms/domain/entities/article.entity.spec.ts`:

```ts
import { Article } from './article.entity';
import { EArticleStatus } from '../enums/article-status.enum';

const makeArticle = (overrides: Partial<ConstructorParameters<typeof Article>[0]> = {}): Article =>
  new Article({
    displayTitle: 'Test Article',
    metaTitle: 'Test Meta',
    content: 'Some content here',
    slug: 'test-article',
    authorId: 'author123456789012345',
    blogId: 'blog1234567890123456',
    createdBy: 'admin123456789012345',
    coverImageId: 'cover123456789012345',
    ...overrides,
  });

describe('Article.schedule()', () => {
  it('sets status to scheduled and stores scheduledAt when date is in the future', () => {
    const article = makeArticle();
    const future = new Date(Date.now() + 60_000);
    article.schedule(future);
    expect(article.status).toBe(EArticleStatus.scheduled);
    expect(article.scheduledAt).toEqual(future);
    expect(article.publishedAt).toBeNull();
  });

  it('throws when scheduledAt is in the past', () => {
    const article = makeArticle();
    const past = new Date(Date.now() - 60_000);
    expect(() => article.schedule(past)).toThrow('scheduledAt must be in the future');
  });

  it('throws when required fields are missing (no coverImageId)', () => {
    const article = makeArticle({ coverImageId: null });
    const future = new Date(Date.now() + 60_000);
    expect(() => article.schedule(future)).toThrow();
  });
});

describe('Article.updatePublishedAt()', () => {
  it('keeps status published and updates publishedAt when date is in the past', () => {
    const article = makeArticle({ status: EArticleStatus.published, publishedAt: new Date() });
    const past = new Date(Date.now() - 60_000);
    article.updatePublishedAt(past);
    expect(article.status).toBe(EArticleStatus.published);
    expect(article.publishedAt).toEqual(past);
    expect(article.scheduledAt).toBeNull();
  });

  it('changes status to scheduled and sets scheduledAt when date is in the future', () => {
    const article = makeArticle({ status: EArticleStatus.published, publishedAt: new Date() });
    const future = new Date(Date.now() + 60_000);
    article.updatePublishedAt(future);
    expect(article.status).toBe(EArticleStatus.scheduled);
    expect(article.scheduledAt).toEqual(future);
    expect(article.publishedAt).toBeNull();
  });

  it('throws when article is in draft status', () => {
    const article = makeArticle({ status: EArticleStatus.draft });
    expect(() => article.updatePublishedAt(new Date())).toThrow(
      'updatePublishedAt is only valid for published or scheduled articles',
    );
  });

  it('works when article is in scheduled status', () => {
    const article = makeArticle({
      status: EArticleStatus.scheduled,
      scheduledAt: new Date(Date.now() + 3600_000),
    });
    const past = new Date(Date.now() - 60_000);
    article.updatePublishedAt(past);
    expect(article.status).toBe(EArticleStatus.published);
    expect(article.publishedAt).toEqual(past);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest src/modules/reserve-cms/domain/entities/article.entity.spec.ts --no-coverage
```

Expected: FAIL — `schedule is not a function`, `updatePublishedAt is not a function`, `scheduledAt` does not exist.

- [ ] **Step 3: Update Article entity**

Replace the content of `src/modules/reserve-cms/domain/entities/article.entity.ts`:

```ts
import { EArticleStatus } from '../enums/article-status.enum';

export class Article {
  public static readonly DEFAULT_LANGUAGE = 'en_us';
  public static readonly LANGUAGE_PATTERN = /^[a-z]{2}_[a-z]{2}$/;

  public readonly id?: string;
  public displayTitle: string;
  public language: string;
  public metaTitle: string;
  public metaDescription: string | null;
  public focusKeyword: string | null;
  public content: string;
  public slug: string;
  public status: EArticleStatus;
  public publishedAt: Date | null;
  public scheduledAt: Date | null;
  public coverImageId: string | null;
  public authorId: string;
  public blogId: string;
  public createdBy: string;
  public lastEditedBy: string | null;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  constructor(data: {
    id?: string;
    displayTitle: string;
    language?: string;
    metaTitle: string;
    metaDescription?: string | null;
    focusKeyword?: string | null;
    content: string;
    slug: string;
    status?: EArticleStatus;
    publishedAt?: Date | null;
    scheduledAt?: Date | null;
    coverImageId?: string | null;
    authorId: string;
    blogId: string;
    createdBy: string;
    lastEditedBy?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = data.id;
    this.displayTitle = data.displayTitle;
    this.language = Article.normalizeLanguage(data.language);
    this.metaTitle = data.metaTitle;
    this.metaDescription = data.metaDescription ?? null;
    this.focusKeyword = data.focusKeyword ?? null;
    this.content = data.content;
    this.slug = data.slug;
    this.status = data.status ?? EArticleStatus.draft;
    this.publishedAt = data.publishedAt ?? null;
    this.scheduledAt = data.scheduledAt ?? null;
    this.coverImageId = data.coverImageId ?? null;
    this.authorId = data.authorId;
    this.blogId = data.blogId;
    this.createdBy = data.createdBy;
    this.lastEditedBy = data.lastEditedBy ?? null;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static normalizeLanguage(language?: string | null): string {
    const normalized = (language ?? Article.DEFAULT_LANGUAGE).trim().toLowerCase();
    if (!Article.LANGUAGE_PATTERN.test(normalized)) {
      throw new Error('Article language must follow ll_cc format, for example en_us or pt_br');
    }
    return normalized;
  }

  canPublish(): boolean {
    return (
      this.displayTitle.length > 0 &&
      this.metaTitle.length > 0 &&
      this.coverImageId !== null &&
      this.authorId.length > 0 &&
      this.content.length > 0
    );
  }

  publish(): void {
    if (!this.canPublish()) {
      const missingFields: string[] = [];
      if (this.displayTitle.length === 0) missingFields.push('displayTitle');
      if (this.metaTitle.length === 0) missingFields.push('metaTitle');
      if (this.coverImageId === null) missingFields.push('coverImageId');
      if (this.authorId.length === 0) missingFields.push('authorId');
      if (this.content.length === 0) missingFields.push('content');
      throw new Error(
        `Article cannot be published: missing required fields - ${missingFields.join(', ')}`,
      );
    }
    this.status = EArticleStatus.published;
    this.publishedAt = new Date();
    this.scheduledAt = null;
  }

  schedule(scheduledAt: Date): void {
    if (!this.canPublish()) {
      const missingFields: string[] = [];
      if (this.displayTitle.length === 0) missingFields.push('displayTitle');
      if (this.metaTitle.length === 0) missingFields.push('metaTitle');
      if (this.coverImageId === null) missingFields.push('coverImageId');
      if (this.authorId.length === 0) missingFields.push('authorId');
      if (this.content.length === 0) missingFields.push('content');
      throw new Error(
        `Article cannot be scheduled: missing required fields - ${missingFields.join(', ')}`,
      );
    }
    if (scheduledAt <= new Date()) {
      throw new Error('scheduledAt must be in the future');
    }
    this.status = EArticleStatus.scheduled;
    this.scheduledAt = scheduledAt;
    this.publishedAt = null;
  }

  updatePublishedAt(newDate: Date): void {
    if (
      this.status !== EArticleStatus.published &&
      this.status !== EArticleStatus.scheduled
    ) {
      throw new Error('updatePublishedAt is only valid for published or scheduled articles');
    }
    if (newDate > new Date()) {
      this.status = EArticleStatus.scheduled;
      this.scheduledAt = newDate;
      this.publishedAt = null;
    } else {
      this.status = EArticleStatus.published;
      this.publishedAt = newDate;
      this.scheduledAt = null;
    }
  }

  validateMetadata(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (this.metaTitle.length > 60) {
      errors.push('meta_title exceeds 60 characters');
    }
    if (this.metaDescription && this.metaDescription.length > 160) {
      errors.push('meta_description exceeds 160 characters');
    }
    return { valid: errors.length === 0, errors };
  }
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npx jest src/modules/reserve-cms/domain/entities/article.entity.spec.ts --no-coverage
```

Expected: PASS — all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/modules/reserve-cms/domain/entities/article.entity.ts \
        src/modules/reserve-cms/domain/entities/article.entity.spec.ts
git commit -m "feat(cms): add scheduledAt field and schedule/updatePublishedAt methods to Article entity"
```

---

## Task 4: Add `findScheduledDue()` to repository interface and Prisma implementation

**Files:**
- Modify: `src/modules/reserve-cms/domain/interfaces/article.repository.interface.ts`
- Modify: `src/modules/reserve-cms/infrastructure/repositories/prisma-article.repository.ts`

- [ ] **Step 1: Update repository interface**

In `src/modules/reserve-cms/domain/interfaces/article.repository.interface.ts`, add `findScheduledDue` to the `IArticleRepository` interface:

```ts
export interface IArticleRepository {
  create(article: Article): Promise<Article>;
  findById(id: string): Promise<Article | null>;
  findBySlugAndBlogId(slug: string, blogId: string): Promise<Article | null>;
  findByBlogId(blogId: string, filters?: ArticleFilters): Promise<PaginatedResult<Article>>;
  findByTenantId(tenantId: string, filters?: ArticleFilters): Promise<PaginatedResult<Article>>;
  update(id: string, data: Partial<Article>): Promise<Article>;
  delete(id: string): Promise<void>;
  countByAuthorId(authorId: string, status?: EArticleStatus): Promise<number>;
  findScheduledDue(): Promise<Article[]>;  // new
}
```

- [ ] **Step 2: Update `toDomain()` in PrismaArticleRepository to map `scheduledAt`**

In `src/modules/reserve-cms/infrastructure/repositories/prisma-article.repository.ts`, update the `toDomain` private method:

```ts
private toDomain(raw: PrismaArticle): Article {
  return new Article({
    id: raw.id,
    displayTitle: raw.display_title,
    language: raw.language,
    metaTitle: raw.meta_title,
    metaDescription: raw.meta_description,
    focusKeyword: raw.focus_keyword,
    content: raw.content,
    slug: raw.slug,
    status: raw.status as EArticleStatus,
    publishedAt: raw.published_at,
    scheduledAt: (raw as any).scheduled_at ?? null,
    coverImageId: raw.cover_image_id,
    authorId: raw.author_id,
    blogId: raw.blog_id,
    createdBy: raw.created_by,
    lastEditedBy: raw.last_edited_by,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  });
}
```

- [ ] **Step 3: Update `update()` in PrismaArticleRepository to map `scheduledAt`**

In the `update()` method, add the mapping for `scheduledAt` after the `publishedAt` line:

```ts
if (data.publishedAt !== undefined) updateData.published_at = data.publishedAt;
if (data.scheduledAt !== undefined) updateData.scheduled_at = data.scheduledAt;  // new line
```

- [ ] **Step 4: Add `findScheduledDue()` implementation**

Add this method to `PrismaArticleRepository` before the `toDomain` private method:

```ts
async findScheduledDue(): Promise<Article[]> {
  try {
    const records = await this.prisma.article.findMany({
      where: {
        status: 'scheduled' as any,
        scheduled_at: { lte: new Date() },
      },
    });
    return records.map((record) => this.toDomain(record));
  } catch (error) {
    throw new RepositoryException('Failed to find scheduled articles due for publication', error);
  }
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/modules/reserve-cms/domain/interfaces/article.repository.interface.ts \
        src/modules/reserve-cms/infrastructure/repositories/prisma-article.repository.ts
git commit -m "feat(cms): add findScheduledDue to article repository interface and Prisma implementation"
```

---

## Task 5: Create `UpdatePublishedAtDTO` and update `PublishArticleDTO`

**Files:**
- Modify: `src/modules/reserve-cms/application/dtos/publish-article.dto.ts`
- Create: `src/modules/reserve-cms/application/dtos/update-published-at.dto.ts`
- Modify: `src/modules/reserve-cms/application/dtos/index.ts`

- [ ] **Step 1: Update `PublishArticleDTO`**

Replace the entire content of `src/modules/reserve-cms/application/dtos/publish-article.dto.ts`:

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class PublishArticleDTO {
  @ApiPropertyOptional({
    description: 'Schedule publication for a future date/time (ISO 8601). If omitted or in the past, publishes immediately.',
    example: '2026-06-01T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
```

- [ ] **Step 2: Create `UpdatePublishedAtDTO`**

Create `src/modules/reserve-cms/application/dtos/update-published-at.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';

export class UpdatePublishedAtDTO {
  @ApiProperty({
    description: 'New published_at timestamp (ISO 8601). If in the future, article is rescheduled. If in the past, corrects the publication date.',
    example: '2026-05-20T14:30:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  publishedAt: string;
}
```

- [ ] **Step 3: Export from index**

In `src/modules/reserve-cms/application/dtos/index.ts`, add the export:

```ts
export { UpdatePublishedAtDTO } from './update-published-at.dto';
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/modules/reserve-cms/application/dtos/publish-article.dto.ts \
        src/modules/reserve-cms/application/dtos/update-published-at.dto.ts \
        src/modules/reserve-cms/application/dtos/index.ts
git commit -m "feat(cms): add scheduledAt to PublishArticleDTO and create UpdatePublishedAtDTO"
```

---

## Task 6: Update `ArticleService` — `publishArticle`, `updatePublishedAt`, `publishScheduledArticles`

**Files:**
- Modify: `src/modules/reserve-cms/application/services/article.service.ts`
- Modify: `src/modules/reserve-cms/application/services/article.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Open `src/modules/reserve-cms/application/services/article.service.spec.ts` and append these test blocks after the existing `describe` blocks. First, check what mock repository methods exist and add `findScheduledDue` to the mock in `beforeEach`:

In the `mockArticleRepository` object inside `beforeEach`, add:

```ts
findScheduledDue: jest.fn(),
findByTenantId: jest.fn(),
countByAuthorId: jest.fn(),
```

Then append the following new `describe` blocks at the end of the outer `describe('ArticleService')` block:

```ts
describe('publishArticle with scheduledAt', () => {
  const articleId = 'article12345678901234';
  const adminId = 'admin1234567890123456';

  const makeFullArticle = () =>
    new Article({
      id: articleId,
      displayTitle: 'Title',
      metaTitle: 'Meta',
      content: 'Content body here',
      slug: 'my-slug',
      authorId: 'author123456789012345',
      blogId: 'blog1234567890123456',
      createdBy: adminId,
      coverImageId: 'cover123456789012345',
      status: EArticleStatus.draft,
    });

  const makeBlog = () => ({
    id: 'blog1234567890123456',
    tenantId: 'tenant12345678901234',
    mediaCollectionId: 'coll1234567890123456',
  });

  it('publishes immediately when no scheduledAt is provided', async () => {
    const article = makeFullArticle();
    const blog = makeBlog();

    articleRepository.findById.mockResolvedValue(article);
    blogRepository.findById.mockResolvedValue(blog as any);
    mediaRelationRepository.findByEntity.mockResolvedValue([]);
    articleRepository.update.mockResolvedValue({
      ...article,
      status: EArticleStatus.published,
      publishedAt: new Date(),
      scheduledAt: null,
    } as any);

    const result = await service.publishArticle(articleId, adminId, {});

    expect(result.status).toBe(200);
    const updated = articleRepository.update.mock.calls[0][1];
    expect(updated.status).toBe(EArticleStatus.published);
  });

  it('schedules when scheduledAt is in the future', async () => {
    const article = makeFullArticle();
    const blog = makeBlog();
    const future = new Date(Date.now() + 3600_000).toISOString();

    articleRepository.findById.mockResolvedValue(article);
    blogRepository.findById.mockResolvedValue(blog as any);
    articleRepository.update.mockResolvedValue({
      ...article,
      status: EArticleStatus.scheduled,
      scheduledAt: new Date(future),
      publishedAt: null,
    } as any);

    const result = await service.publishArticle(articleId, adminId, { scheduledAt: future });

    expect(result.status).toBe(200);
    const updated = articleRepository.update.mock.calls[0][1];
    expect(updated.status).toBe(EArticleStatus.scheduled);
    expect(updated.scheduledAt).toEqual(new Date(future));
  });

  it('returns 400 when scheduledAt is in the past', async () => {
    const article = makeFullArticle();
    const blog = makeBlog();
    const past = new Date(Date.now() - 3600_000).toISOString();

    articleRepository.findById.mockResolvedValue(article);
    blogRepository.findById.mockResolvedValue(blog as any);

    const result = await service.publishArticle(articleId, adminId, { scheduledAt: past });

    expect(result.status).toBe(400);
  });
});

describe('updatePublishedAt', () => {
  const articleId = 'article12345678901234';
  const adminId = 'admin1234567890123456';

  const makePublishedArticle = () =>
    new Article({
      id: articleId,
      displayTitle: 'Title',
      metaTitle: 'Meta',
      content: 'Content body here',
      slug: 'my-slug',
      authorId: 'author123456789012345',
      blogId: 'blog1234567890123456',
      createdBy: adminId,
      coverImageId: 'cover123456789012345',
      status: EArticleStatus.published,
      publishedAt: new Date(),
    });

  it('returns 404 when article not found', async () => {
    articleRepository.findById.mockResolvedValue(null);
    const result = await service.updatePublishedAt(articleId, new Date(), adminId);
    expect(result.status).toBe(404);
  });

  it('returns 409 when article is in draft status', async () => {
    const article = new Article({
      id: articleId,
      displayTitle: 'Title',
      metaTitle: 'Meta',
      content: 'Content',
      slug: 'slug',
      authorId: 'author123456789012345',
      blogId: 'blog1234567890123456',
      createdBy: adminId,
      status: EArticleStatus.draft,
    });
    articleRepository.findById.mockResolvedValue(article);
    const result = await service.updatePublishedAt(articleId, new Date(), adminId);
    expect(result.status).toBe(409);
  });

  it('updates publishedAt to a past date keeping published status', async () => {
    const article = makePublishedArticle();
    const past = new Date(Date.now() - 3600_000);
    articleRepository.findById.mockResolvedValue(article);
    articleRepository.update.mockResolvedValue({ ...article, publishedAt: past } as any);

    const result = await service.updatePublishedAt(articleId, past, adminId);

    expect(result.status).toBe(200);
    const updated = articleRepository.update.mock.calls[0][1];
    expect(updated.status).toBe(EArticleStatus.published);
    expect(updated.publishedAt).toEqual(past);
    expect(updated.scheduledAt).toBeNull();
    expect(updated.lastEditedBy).toBeUndefined();
  });

  it('sets status to scheduled when new date is in the future', async () => {
    const article = makePublishedArticle();
    const future = new Date(Date.now() + 3600_000);
    articleRepository.findById.mockResolvedValue(article);
    articleRepository.update.mockResolvedValue({ ...article, status: EArticleStatus.scheduled, scheduledAt: future } as any);

    const result = await service.updatePublishedAt(articleId, future, adminId);

    expect(result.status).toBe(200);
    const updated = articleRepository.update.mock.calls[0][1];
    expect(updated.status).toBe(EArticleStatus.scheduled);
    expect(updated.scheduledAt).toEqual(future);
    expect(updated.publishedAt).toBeNull();
  });
});

describe('publishScheduledArticles', () => {
  it('publishes all due articles and does not set lastEditedBy', async () => {
    const due = new Article({
      id: 'article12345678901234',
      displayTitle: 'Title',
      metaTitle: 'Meta',
      content: 'Content body here',
      slug: 'my-slug',
      authorId: 'author123456789012345',
      blogId: 'blog1234567890123456',
      createdBy: 'admin1234567890123456',
      coverImageId: 'cover123456789012345',
      status: EArticleStatus.scheduled,
      scheduledAt: new Date(Date.now() - 1000),
    });

    articleRepository.findScheduledDue.mockResolvedValue([due]);
    articleRepository.update.mockResolvedValue({ ...due, status: EArticleStatus.published } as any);

    await service.publishScheduledArticles();

    expect(articleRepository.update).toHaveBeenCalledWith(due.id, {
      status: EArticleStatus.published,
      publishedAt: due.scheduledAt,
      scheduledAt: null,
    });
    const updateCall = articleRepository.update.mock.calls[0][1];
    expect(updateCall.lastEditedBy).toBeUndefined();
  });

  it('does not call update when no articles are due', async () => {
    articleRepository.findScheduledDue.mockResolvedValue([]);
    await service.publishScheduledArticles();
    expect(articleRepository.update).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest src/modules/reserve-cms/application/services/article.service.spec.ts --no-coverage
```

Expected: FAIL — `updatePublishedAt is not a function`, `publishScheduledArticles is not a function`, scheduling logic not implemented yet.

- [ ] **Step 3: Update `ArticleService`**

Add these new error constants near the top of the service (after the existing constants):

```ts
const ERROR_ARTICLE_NOT_SCHEDULED_OR_PUBLISHED = '409:Article must be in published or scheduled status';
const ERROR_SCHEDULED_AT_NOT_FUTURE = '400:scheduledAt must be a future date and time';
```

Update `publishArticle` signature and logic. Find the existing `publishArticle` method and replace it entirely:

```ts
async publishArticle(
  id: string,
  currentAdminId: string,
  dto: { scheduledAt?: string },
): Promise<ServiceResponse<Article>> {
  try {
    const article = await this.articleRepository.findById(id);
    if (!article) {
      return errorResponse(ERROR_ARTICLE_NOT_FOUND, 404);
    }

    const blog = await this.blogRepository.findById(article.blogId);
    if (!blog) {
      return errorResponse(ERROR_BLOG_NOT_FOUND, 404);
    }

    if (!blog.mediaCollectionId) {
      return errorResponse(ERROR_BLOG_MEDIA_COLLECTION_NOT_CONFIGURED, 400);
    }

    if (!article.canPublish()) {
      const missingFields: string[] = [];
      if (!article.displayTitle || article.displayTitle.length === 0) missingFields.push('displayTitle');
      if (!article.metaTitle || article.metaTitle.length === 0) missingFields.push('metaTitle');
      if (article.coverImageId === null) missingFields.push('coverImageId');
      if (!article.authorId || article.authorId.length === 0) missingFields.push('authorId');
      if (!article.content || article.content.length === 0) missingFields.push('content');
      return {
        status: 400,
        data: {
          code: ERROR_ARTICLE_CANNOT_PUBLISH,
          message: `Article cannot be published: missing required fields - ${missingFields.join(', ')}`,
        },
      };
    }

    // Scheduling path
    if (dto.scheduledAt) {
      const scheduledAt = new Date(dto.scheduledAt);
      if (scheduledAt <= new Date()) {
        return errorResponse(ERROR_SCHEDULED_AT_NOT_FUTURE, 400);
      }
      article.schedule(scheduledAt);
      const updated = await this.articleRepository.update(id, {
        status: article.status,
        scheduledAt: article.scheduledAt,
        publishedAt: null,
        lastEditedBy: currentAdminId,
      });
      return successResponse(updated, 200);
    }

    // Immediate publish path
    const imageValidation = await this.validateImageReferences(
      article.content,
      blog.tenantId,
      blog.mediaCollectionId,
    );
    if (!imageValidation.valid) {
      return errorResponse(ERROR_INVALID_IMAGE_REFERENCE, 400, {
        invalidReferences: imageValidation.invalidReferences,
      });
    }

    if (article.coverImageId) {
      const coverImageValidation = await this.validateAssetBelongsToBlogCollection(
        article.coverImageId,
        blog.tenantId,
        blog.mediaCollectionId,
      );
      if (!coverImageValidation.valid) {
        return errorResponse(ERROR_ASSET_NOT_IN_BLOG_COLLECTION, 400);
      }
    }

    article.publish();
    const publishedArticle = await this.articleRepository.update(id, {
      status: article.status,
      publishedAt: article.publishedAt,
      scheduledAt: null,
      lastEditedBy: currentAdminId,
    });

    return successResponse(publishedArticle, 200);
  } catch (error) {
    return errorResponse(ERROR_UPDATE_ARTICLE, 500, error);
  }
}
```

Add `updatePublishedAt` method after `publishArticle`:

```ts
async updatePublishedAt(
  id: string,
  newDate: Date,
  currentAdminId: string,
): Promise<ServiceResponse<Article>> {
  try {
    const article = await this.articleRepository.findById(id);
    if (!article) {
      return errorResponse(ERROR_ARTICLE_NOT_FOUND, 404);
    }

    if (
      article.status !== EArticleStatus.published &&
      article.status !== EArticleStatus.scheduled
    ) {
      return errorResponse(ERROR_ARTICLE_NOT_SCHEDULED_OR_PUBLISHED, 409);
    }

    article.updatePublishedAt(newDate);

    const updated = await this.articleRepository.update(id, {
      status: article.status,
      publishedAt: article.publishedAt,
      scheduledAt: article.scheduledAt,
    });

    return successResponse(updated, 200);
  } catch (error) {
    return errorResponse(ERROR_UPDATE_ARTICLE, 500, error);
  }
}
```

Add `publishScheduledArticles` method after `updatePublishedAt`:

```ts
async publishScheduledArticles(): Promise<void> {
  const due = await this.articleRepository.findScheduledDue();

  for (const article of due) {
    try {
      await this.articleRepository.update(article.id!, {
        status: EArticleStatus.published,
        publishedAt: article.scheduledAt!,
        scheduledAt: null,
      });
    } catch (error) {
      console.error(`Failed to auto-publish article ${article.id}:`, error);
    }
  }
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npx jest src/modules/reserve-cms/application/services/article.service.spec.ts --no-coverage
```

Expected: PASS — all existing and new tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/modules/reserve-cms/application/services/article.service.ts \
        src/modules/reserve-cms/application/services/article.service.spec.ts
git commit -m "feat(cms): update publishArticle for scheduling, add updatePublishedAt and publishScheduledArticles to ArticleService"
```

---

## Task 7: Create `ArticleSchedulerService`

**Files:**
- Create: `src/modules/reserve-cms/application/services/article-scheduler.service.ts`

- [ ] **Step 1: Create the scheduler service**

Create `src/modules/reserve-cms/application/services/article-scheduler.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ArticleService } from './article.service';

@Injectable()
export class ArticleSchedulerService {
  private readonly logger = new Logger(ArticleSchedulerService.name);

  constructor(private readonly articleService: ArticleService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async publishScheduledArticles(): Promise<void> {
    this.logger.log('Running scheduled article publication check');
    await this.articleService.publishScheduledArticles();
  }
}
```

- [ ] **Step 2: Register in `ReserveCmsModule`**

In `src/modules/reserve-cms/reserve-cms.module.ts`:

Add the import at the top:
```ts
import { ArticleSchedulerService } from './application/services/article-scheduler.service';
```

Add to the `providers` array:
```ts
ArticleSchedulerService,
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/reserve-cms/application/services/article-scheduler.service.ts \
        src/modules/reserve-cms/reserve-cms.module.ts
git commit -m "feat(cms): add ArticleSchedulerService with @Cron(EVERY_MINUTE) for auto-publication"
```

---

## Task 8: Update controller — `publish` endpoint and new `PATCH /published-at`

**Files:**
- Modify: `src/modules/reserve-cms/infrastructure/controllers/article.controller.ts`

- [ ] **Step 1: Update the controller**

In `src/modules/reserve-cms/infrastructure/controllers/article.controller.ts`:

Add `Patch` to the NestJS imports:
```ts
import {
  Controller, Post, Get, Put, Patch, Delete,
  Body, Param, Query, UseGuards, Res,
} from '@nestjs/common';
```

Add the DTO imports:
```ts
import { PublishArticleDTO } from '../../application/dtos/publish-article.dto';
import { UpdatePublishedAtDTO } from '../../application/dtos/update-published-at.dto';
```

Replace the existing `publish` method:

```ts
@Post(':id/publish')
@Roles(EAdminRole.editor)
@ApiOperation({ summary: 'Publish or schedule an article' })
@ApiResponse({ status: 200, description: 'Article published or scheduled successfully' })
@ApiResponse({ status: 400, description: 'Missing required fields or scheduledAt is in the past' })
@ApiResponse({ status: 403, description: 'Insufficient role' })
@ApiResponse({ status: 404, description: 'Article not found' })
async publish(
  @CurrentAdmin() admin: CurrentAdminPayload,
  @Param('id') id: string,
  @Body() dto: PublishArticleDTO,
  @Res() res: Response,
) {
  const result = await this.articleService.publishArticle(id, admin.id, dto);

  if (result.status !== 200) {
    return res.status(result.status).json(result.data);
  }

  const presented = ArticlePresenter.present(result.data as any);
  return res.status(result.status).json(presented);
}
```

Add the new `updatePublishedAt` endpoint after the `publish` method and before `archive`:

```ts
@Patch(':id/published-at')
@Roles(EAdminRole.editor)
@ApiOperation({ summary: 'Edit the published_at date of a published or scheduled article' })
@ApiResponse({ status: 200, description: 'Publication date updated successfully' })
@ApiResponse({ status: 400, description: 'Validation error' })
@ApiResponse({ status: 403, description: 'Insufficient role' })
@ApiResponse({ status: 404, description: 'Article not found' })
@ApiResponse({ status: 409, description: 'Article must be in published or scheduled status' })
async updatePublishedAt(
  @CurrentAdmin() admin: CurrentAdminPayload,
  @Param('id') id: string,
  @Body() dto: UpdatePublishedAtDTO,
  @Res() res: Response,
) {
  const result = await this.articleService.updatePublishedAt(
    id,
    new Date(dto.publishedAt),
    admin.id,
  );

  if (result.status !== 200) {
    return res.status(result.status).json(result.data);
  }

  const presented = ArticlePresenter.present(result.data as any);
  return res.status(result.status).json(presented);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/reserve-cms/infrastructure/controllers/article.controller.ts
git commit -m "feat(cms): update publish endpoint and add PATCH /articles/:id/published-at endpoint"
```

---

## Task 9: Expose `scheduled_at` in `ArticlePresenter`

**Files:**
- Modify: `src/modules/reserve-cms/infrastructure/presenters/article.presenter.ts`

- [ ] **Step 1: Add `scheduled_at` to the presenter output**

In `ArticlePresenter.present()`, add `scheduled_at` after `published_at`:

```ts
published_at: article.publishedAt,
scheduled_at: article.scheduledAt,   // new line
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run the full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/modules/reserve-cms/infrastructure/presenters/article.presenter.ts
git commit -m "feat(cms): expose scheduled_at in ArticlePresenter response"
```

---

## Self-Review Checklist

After writing the plan, I verified:

1. **Spec coverage:**
   - `scheduled` status added ✓ (Task 1, 2)
   - `scheduledAt` column in DB ✓ (Task 2)
   - `Article.schedule()` method ✓ (Task 3)
   - `Article.updatePublishedAt()` method ✓ (Task 3)
   - `findScheduledDue()` in repository ✓ (Task 4)
   - `PublishArticleDTO` updated with `scheduledAt` ✓ (Task 5)
   - `UpdatePublishedAtDTO` created ✓ (Task 5)
   - `publishArticle()` updated in service ✓ (Task 6)
   - `updatePublishedAt()` added to service ✓ (Task 6)
   - `publishScheduledArticles()` added to service ✓ (Task 6)
   - `ArticleSchedulerService` with `@Cron` ✓ (Task 7)
   - `POST /publish` endpoint updated ✓ (Task 8)
   - `PATCH /published-at` endpoint created ✓ (Task 8)
   - `scheduled_at` exposed in presenter ✓ (Task 9)
   - `lastEditedBy` NOT set by cron or `updatePublishedAt` ✓ (Task 6)
   - Public API unchanged (filters by `published` only) ✓ — no task needed, existing code already correct

2. **No placeholders** — all code is complete and concrete.

3. **Type consistency:**
   - `scheduledAt: Date | null` used consistently across entity, repository, and service
   - `PublishArticleDTO.scheduledAt` is `string` (ISO from HTTP), converted to `Date` in service ✓
   - `UpdatePublishedAtDTO.publishedAt` is `string` (ISO from HTTP), converted to `Date` in controller ✓
   - `articleRepository.update` receives `Partial<Article>` — `scheduledAt` is now a field on `Article` ✓
