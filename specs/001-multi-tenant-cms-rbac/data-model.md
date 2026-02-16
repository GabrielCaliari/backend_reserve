# Data Model: Multi-Tenant CMS with Blog and RBAC

**Phase 1 Output** | **Date**: 2026-02-16

## Entity Relationship Overview

```
Admin (existing) ──┐
                   │ 1:N
                   ▼
AdminTenant (existing, extended) ──┐
  + role: EAdminRole (NEW)         │ N:1
                                   ▼
                              Tenant (existing) ──┐
                                                  │ 1:N
                                                  ▼
                                              Blog (NEW)
                                                │ 1:N
                                                ▼
                                           Article (NEW)
                                              │ 1:N
                                              ▼
                                         ArticleImage (NEW)
```

---

## Modified Entities

### EAdminRole (Prisma enum -- expanded)

```
enum EAdminRole {
  super_admin       // Platform operator — full access across all tenants
  owner             // Tenant owner — full access within assigned tenant
  manager           // Tenant manager — can manage blogs (create, delete) and articles
  editor            // Content editor — can create and manage articles and images
  viewer            // Read-only access to tenant content
  company_admin     // DEPRECATED: retained for backward compatibility during migration
}
```

**Role Hierarchy** (higher can do everything lower can do):
`super_admin > owner > manager > editor > viewer`

**Migration**: Existing `company_admin` entries in `Admin.role` and new `AdminTenant.role`
defaults map to `manager` for functional equivalence. The `company_admin` value is retained
in the enum but documented as deprecated.

### AdminTenant (existing table -- extended)

| Field | Type | Constraint | Notes |
|---|---|---|---|
| id | Int | PK, auto-increment | Existing |
| admin_id | Int | FK -> Admin.id | Existing |
| tenant_id | Int | FK -> Tenant.id | Existing |
| role | EAdminRole | NOT NULL, default: `manager` | **NEW** -- per-tenant role |
| active | Boolean | default: true | Existing |
| created_at | DateTime | default: now() | Existing |
| updated_at | DateTime | auto-update | Existing |

**Unique constraint**: `[admin_id, tenant_id]` (existing)

---

## New Entities

### Blog

| Field | Type | Constraint | Notes |
|---|---|---|---|
| id | Int | PK, auto-increment | |
| name | String | VARCHAR(150), NOT NULL | Display name |
| description | String | TEXT, nullable | Blog description/purpose |
| slug | String | VARCHAR(100), NOT NULL | URL-friendly identifier |
| secret_key_hash | String | NOT NULL | SHA-256 hash of the secret key |
| secret_key_salt | String | NOT NULL | Salt used for hashing |
| tenant_id | Int | FK -> Tenant.id, NOT NULL | Owning tenant |
| active | Boolean | default: true | Soft delete mechanism |
| created_at | DateTime | default: now() | |
| updated_at | DateTime | auto-update | |

**Unique constraint**: `[slug, tenant_id]`
**Index**: `[tenant_id]`

**Relationships**:
- Blog N:1 Tenant (a tenant can have many blogs)
- Blog 1:N Article (a blog contains many articles)

### EArticleStatus (new Prisma enum)

```
enum EArticleStatus {
  draft
  published
  archived
}
```

### Article

| Field | Type | Constraint | Notes |
|---|---|---|---|
| id | Int | PK, auto-increment | |
| title | String | VARCHAR(255), NOT NULL | Article headline |
| content | String | TEXT, NOT NULL | Rich text/markdown content |
| slug | String | VARCHAR(255), NOT NULL | URL-friendly identifier |
| status | EArticleStatus | NOT NULL, default: `draft` | Lifecycle state |
| display_order | Int | NOT NULL, default: 0 | Position in blog listing |
| published_at | DateTime | nullable | Set when status -> published |
| blog_id | Int | FK -> Blog.id, NOT NULL | Parent blog |
| created_at | DateTime | default: now() | |
| updated_at | DateTime | auto-update | |

**Unique constraint**: `[slug, blog_id]`
**Index**: `[blog_id, status, display_order]` (optimized for public listing query)

**Relationships**:
- Article N:1 Blog (an article belongs to one blog)
- Article 1:N ArticleImage (an article can have many images)

**State Transitions**:

```
               publish()
  ┌─────────┐ ──────────> ┌───────────┐
  │  DRAFT  │             │ PUBLISHED │
  └─────────┘ <────────── └───────────┘
                unpublish()      │
                                 │ archive()
                                 ▼
                           ┌──────────┐
                           │ ARCHIVED │
                           └──────────┘
                                 │
                                 │ unarchive()
                                 ▼
                           ┌─────────┐
                           │  DRAFT  │
                           └─────────┘
```

- `draft` -> `published`: Sets `published_at` to current timestamp.
- `published` -> `archived`: Removes from public API. Preserves `published_at`.
- `archived` -> `draft`: Allows re-editing. Clears `published_at`.
- `published` -> `draft`: Allows re-editing. Clears `published_at`.

### ArticleImage

| Field | Type | Constraint | Notes |
|---|---|---|---|
| id | Int | PK, auto-increment | |
| url | String | NOT NULL | Full URL to stored image |
| storage_key | String | NOT NULL | S3 object key for deletion |
| alt_text | String | VARCHAR(255), nullable | Accessibility text |
| display_order | Int | NOT NULL, default: 0 | Position in article gallery |
| file_size | Int | NOT NULL | Size in bytes (after compression) |
| original_format | String | VARCHAR(10), NOT NULL | Original upload format (jpeg, png, etc.) |
| article_id | Int | FK -> Article.id, NOT NULL | Parent article |
| created_at | DateTime | default: now() | |
| updated_at | DateTime | auto-update | |

**Index**: `[article_id, display_order]`

**Relationships**:
- ArticleImage N:1 Article (an image belongs to one article)

**Validation Rules**:
- Maximum 20 images per article (enforced at application layer).
- Maximum file size: 10 MB per upload (enforced at controller/multer layer).
- Accepted input formats: JPEG, PNG, GIF, WebP, AVIF.
- Output format: always `.webp` (converted by IImageProcessor).

---

## Prisma Schema Changes (preview)

```prisma
// Add to existing EAdminRole enum
enum EAdminRole {
  super_admin
  owner
  manager
  editor
  viewer
  company_admin // DEPRECATED
}

// New enum
enum EArticleStatus {
  draft
  published
  archived
}

// Modified model
model AdminTenant {
  id         Int        @id @default(autoincrement())
  admin_id   Int
  tenant_id  Int
  role       EAdminRole @default(manager) // NEW COLUMN
  active     Boolean    @default(true)
  created_at DateTime   @default(now())
  updated_at DateTime   @updatedAt
  Admin      Admin      @relation(fields: [admin_id], references: [id])
  Tenant     Tenant     @relation(fields: [tenant_id], references: [id])

  @@unique([admin_id, tenant_id])
}

// New models
model Blog {
  id              Int       @id @default(autoincrement())
  name            String    @db.VarChar(150)
  description     String?
  slug            String    @db.VarChar(100)
  secret_key_hash String
  secret_key_salt String
  tenant_id       Int
  active          Boolean   @default(true)
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt
  Tenant          Tenant    @relation(fields: [tenant_id], references: [id])
  Article         Article[]

  @@unique([slug, tenant_id])
  @@index([tenant_id])
}

model Article {
  id            Int             @id @default(autoincrement())
  title         String          @db.VarChar(255)
  content       String
  slug          String          @db.VarChar(255)
  status        EArticleStatus  @default(draft)
  display_order Int             @default(0)
  published_at  DateTime?
  blog_id       Int
  created_at    DateTime        @default(now())
  updated_at    DateTime        @updatedAt
  Blog          Blog            @relation(fields: [blog_id], references: [id], onDelete: Cascade)
  ArticleImage  ArticleImage[]

  @@unique([slug, blog_id])
  @@index([blog_id, status, display_order])
}

model ArticleImage {
  id              Int      @id @default(autoincrement())
  url             String
  storage_key     String
  alt_text        String?  @db.VarChar(255)
  display_order   Int      @default(0)
  file_size       Int
  original_format String   @db.VarChar(10)
  article_id      Int
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  Article         Article  @relation(fields: [article_id], references: [id], onDelete: Cascade)

  @@index([article_id, display_order])
}
```

---

## Domain Interfaces (Ports)

### IBlogRepository

```typescript
export interface ICreateBlog {
  name: string;
  description?: string;
  slug: string;
  secret_key_hash: string;
  secret_key_salt: string;
  tenant_id: number;
}

export interface IBlogRepository {
  create(data: ICreateBlog): Promise<any>;
  findById(id: number): Promise<any>;
  findBySlugAndTenantId(slug: string, tenantId: number): Promise<any>;
  findAllByTenantId(tenantId: number): Promise<any[]>;
  findBySecretKey(secretKeyHash: string): Promise<any>;
  update(id: number, data: Partial<ICreateBlog>): Promise<any>;
  delete(id: number): Promise<void>;
}

export const BLOG_REPOSITORY = Symbol('BLOG_REPOSITORY');
```

### IArticleRepository

```typescript
export interface ICreateArticle {
  title: string;
  content: string;
  slug: string;
  blog_id: number;
}

export interface IArticleRepository {
  create(data: ICreateArticle): Promise<any>;
  findById(id: number): Promise<any>;
  findBySlugAndBlogId(slug: string, blogId: number): Promise<any>;
  existsBySlugAndBlogId(slug: string, blogId: number): Promise<boolean>;
  findAllByBlogId(blogId: number): Promise<any[]>;
  findPublishedByBlogId(blogId: number): Promise<any[]>;
  findPublishedBySlugAndBlogId(slug: string, blogId: number): Promise<any>;
  update(id: number, data: Partial<any>): Promise<any>;
  updateDisplayOrders(items: { id: number; display_order: number }[]): Promise<void>;
  delete(id: number): Promise<void>;
}

export const ARTICLE_REPOSITORY = Symbol('ARTICLE_REPOSITORY');
```

### IArticleImageRepository

```typescript
export interface ICreateArticleImage {
  url: string;
  storage_key: string;
  alt_text?: string;
  display_order: number;
  file_size: number;
  original_format: string;
  article_id: number;
}

export interface IArticleImageRepository {
  create(data: ICreateArticleImage): Promise<any>;
  findById(id: number): Promise<any>;
  findAllByArticleId(articleId: number): Promise<any[]>;
  countByArticleId(articleId: number): Promise<number>;
  updateDisplayOrders(items: { id: number; display_order: number }[]): Promise<void>;
  delete(id: number): Promise<void>;
  deleteAllByArticleId(articleId: number): Promise<void>;
}

export const ARTICLE_IMAGE_REPOSITORY = Symbol('ARTICLE_IMAGE_REPOSITORY');
```

### IStorageProvider

```typescript
export interface IUploadResult {
  url: string;
  key: string;
}

export interface IStorageProvider {
  upload(key: string, data: Buffer, contentType: string): Promise<IUploadResult>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
```

### IImageProcessor

```typescript
export interface IProcessedImage {
  data: Buffer;
  size: number;
  format: string; // always 'webp'
}

export interface IImageProcessor {
  processToWebp(buffer: Buffer, quality?: number): Promise<IProcessedImage>;
}

export const IMAGE_PROCESSOR = Symbol('IMAGE_PROCESSOR');
```
