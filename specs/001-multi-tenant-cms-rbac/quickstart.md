# Quickstart: Multi-Tenant CMS with Blog and RBAC

**Phase 1 Output** | **Date**: 2026-02-16

This guide helps developers get started with the `zarp-cms` bounded context.

## Prerequisites

- Node.js 20+ and pnpm installed
- PostgreSQL running locally or accessible
- Vercel Blob Storage token (or S3-compatible storage credentials)
- Existing `api_zarp-admin` codebase cloned and set up

## Step 1: Switch to the feature branch

```powershell
git checkout 001-multi-tenant-cms-rbac
```

## Step 2: Install new dependencies

```powershell
pnpm add sharp @vercel/blob
```

## Step 3: Add environment variables

Add these to your `.env` file:

```env
# CMS Vercel Blob Storage (default)
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token

# Image Processing
CMS_IMAGE_QUALITY=80
CMS_IMAGE_MAX_SIZE_BYTES=10485760
CMS_MAX_IMAGES_PER_ARTICLE=20
```

**Note**: The module uses Vercel Blob Storage by default. To switch to S3, see the README in `src/modules/zarp-cms/infrastructure/providers/`.

## Step 4: Run Prisma migration

After schema changes are applied:

```powershell
pnpm exec prisma migrate dev --name cms-rbac-expansion
```

## Step 5: Seed admin roles

```powershell
pnpm exec prisma db seed
```

This will:
- Expand the `EAdminRole` enum with new roles
- Add the `role` column to `AdminTenant` (defaulting to `manager`)
- Create Blog, Article, and ArticleImage tables

## Step 6: Verify

```powershell
pnpm run test
pnpm run start:dev
```

Access Swagger docs at `http://localhost:3000/api` to see the new CMS endpoints.

---

## Architecture Overview

### Layer Structure

```
src/modules/zarp-cms/
├── domain/           # Pure TypeScript: entities, enums, errors, interfaces
├── application/      # Services (use cases) and DTOs
├── infrastructure/   # Controllers, Prisma repositories, guards, providers
└── zarp-cms.module.ts
```

### Key Interfaces (Ports)

| Interface | Token | Implementation |
|---|---|---|
| `IBlogRepository` | `BLOG_REPOSITORY` | `PrismaBlogRepository` |
| `IArticleRepository` | `ARTICLE_REPOSITORY` | `PrismaArticleRepository` |
| `IArticleImageRepository` | `ARTICLE_IMAGE_REPOSITORY` | `PrismaArticleImageRepository` |
| `IStorageProvider` | `STORAGE_PROVIDER` | `VercelBlobStorageProvider` (default) or `S3StorageProvider` |
| `IImageProcessor` | `IMAGE_PROCESSOR` | `SharpImageProcessorProvider` |

### Guard Chain

**Admin endpoints**: `AdminJwtGuard -> TenantGuard -> RolesGuard`
**Public endpoints**: `BlogSecretKeyGuard`

### Role Hierarchy

| Role | Create Blog | Delete Blog | Create Article | Publish | View | Regen Key |
|---|---|---|---|---|---|---|
| `super_admin` | Yes | Yes | Yes | Yes | Yes | Yes |
| `owner` | Yes | Yes | Yes | Yes | Yes | Yes |
| `manager` | Yes | Yes | Yes | Yes | Yes | No |
| `editor` | No | No | Yes | Yes | Yes | No |
| `viewer` | No | No | No | No | Yes | No |

---

## Testing Guide

### Unit Tests (TDD)

All domain and service tests use in-memory fakes:

```typescript
// Example: In-memory blog repository for TDD
class InMemoryBlogRepository implements IBlogRepository {
  private blogs: any[] = [];
  private nextId = 1;

  async create(data: ICreateBlog): Promise<any> {
    const blog = { id: this.nextId++, ...data, active: true };
    this.blogs.push(blog);
    return blog;
  }
  // ... other methods
}
```

### Run tests

```powershell
# All tests
pnpm run test

# CMS module only
pnpm run test -- --testPathPattern="zarp-cms"

# Watch mode
pnpm run test:watch -- --testPathPattern="zarp-cms"
```

---

## API Quick Reference

### Admin (JWT + TenantGuard + RolesGuard)

| Method | Endpoint | Min Role |
|---|---|---|
| POST | `/api/cms/blogs` | manager |
| GET | `/api/cms/blogs` | viewer |
| PUT | `/api/cms/blogs/:blogId` | editor |
| DELETE | `/api/cms/blogs/:blogId` | manager |
| POST | `/api/cms/blogs/:blogId/regenerate-key` | owner |
| POST | `/api/cms/blogs/:blogId/articles` | editor |
| GET | `/api/cms/blogs/:blogId/articles` | viewer |
| PUT | `/api/cms/blogs/:blogId/articles/:articleId` | editor |
| DELETE | `/api/cms/blogs/:blogId/articles/:articleId` | editor |
| POST | `/api/cms/blogs/:blogId/articles/:articleId/publish` | editor |
| POST | `/api/cms/blogs/:blogId/articles/:articleId/archive` | editor |
| PUT | `/api/cms/blogs/:blogId/articles/reorder` | editor |
| POST | `/api/cms/articles/:articleId/images` | editor |
| DELETE | `/api/cms/articles/:articleId/images/:imageId` | editor |
| PUT | `/api/cms/articles/:articleId/images/reorder` | editor |

### Public (x-blog-secret-key header)

| Method | Endpoint |
|---|---|
| GET | `/api/cms/public/articles` |
| GET | `/api/cms/public/articles/:slug` |
