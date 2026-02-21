# Design Document: CMS Blog Article Refactoring

## Overview

This design document outlines the technical approach for refactoring the CMS blog and article management system. The refactoring consolidates image management through the existing MediaAsset system, introduces proper SEO metadata fields, adds author management, and enhances audit trails. The design follows Domain-Driven Design principles with clear separation between domain entities, application services, and infrastructure adapters.

### Key Design Decisions

1. **MediaAsset Integration**: Leverage the existing generic storage system rather than maintaining separate ArticleImage entities
2. **Polymorphic Relations**: Use MediaAssetRelation for flexible image-to-entity associations
3. **SEO-First Metadata**: Separate display titles from meta titles for better search optimization
4. **Author as First-Class Entity**: Dedicated Author model rather than embedding author info in articles
5. **Backward Compatible Migration**: Preserve all existing data during schema changes

## Architecture

### Layer Organization

Following the project's DDD structure:

```
src/modules/zarp-cms/
├── domain/
│   ├── entities/
│   │   ├── blog.entity.ts
│   │   ├── article.entity.ts
│   │   └── author.entity.ts
│   ├── value-objects/
│   │   ├── seo-metadata.vo.ts
│   │   └── slug.vo.ts
│   ├── enums/
│   │   └── article-status.enum.ts (existing)
│   ├── interfaces/
│   │   ├── blog.repository.interface.ts
│   │   ├── article.repository.interface.ts
│   │   └── author.repository.interface.ts
│   └── errors/
│       ├── article-validation.error.ts
│       └── author-not-found.error.ts
├── application/
│   ├── services/
│   │   ├── blog.service.ts
│   │   ├── article.service.ts
│   │   └── author.service.ts
│   └── dtos/
│       ├── create-article.dto.ts
│       ├── update-article.dto.ts
│       ├── create-author.dto.ts
│       └── article-response.dto.ts
└── infrastructure/
    ├── controllers/
    │   ├── blog.controller.ts
    │   ├── article.controller.ts
    │   └── author.controller.ts
    ├── repositories/
    │   ├── prisma-blog.repository.ts
    │   ├── prisma-article.repository.ts
    │   └── prisma-author.repository.ts
    └── presenters/
        ├── article.presenter.ts
        └── author.presenter.ts
```


## Components and Interfaces

### Domain Entities

#### Blog Entity

```typescript
// domain/entities/blog.entity.ts
export class Blog {
  public readonly id?: string; // UUID (12 characters)
  public name: string;
  public description: string | null;
  public secretKeyHash: string;
  public secretKeySalt: string;
  public tenantId: number;
  public active: boolean;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  constructor(data: {
    id?: string;
    name: string;
    description?: string | null;
    secretKeyHash: string;
    secretKeySalt: string;
    tenantId: number;
    active?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description ?? null;
    this.secretKeyHash = data.secretKeyHash;
    this.secretKeySalt = data.secretKeySalt;
    this.tenantId = data.tenantId;
    this.active = data.active ?? true;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  validateName(): boolean {
    return this.name.length > 0 && this.name.length <= 150;
  }
}
```

#### Article Entity

```typescript
// domain/entities/article.entity.ts
export class Article {
  public readonly id?: number;
  public displayTitle: string;
  public metaTitle: string;
  public metaDescription: string | null;
  public focusKeyword: string | null;
  public content: string;
  public slug: string;
  public status: EArticleStatus;
  public displayOrder: number;
  public publishedAt: Date | null;
  public coverImageId: number | null;
  public authorId: number;
  public blogId: string; // UUID reference to Blog
  public createdBy: number;
  public lastEditedBy: number | null;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  constructor(data: ArticleConstructorData) {
    this.id = data.id;
    this.displayTitle = data.displayTitle;
    this.metaTitle = data.metaTitle;
    this.metaDescription = data.metaDescription ?? null;
    this.focusKeyword = data.focusKeyword ?? null;
    this.content = data.content;
    this.slug = data.slug;
    this.status = data.status ?? EArticleStatus.draft;
    this.displayOrder = data.displayOrder ?? 0;
    this.publishedAt = data.publishedAt ?? null;
    this.coverImageId = data.coverImageId ?? null;
    this.authorId = data.authorId;
    this.blogId = data.blogId;
    this.createdBy = data.createdBy;
    this.lastEditedBy = data.lastEditedBy ?? null;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  canPublish(): boolean {
    return (
      this.displayTitle.length > 0 &&
      this.metaTitle.length > 0 &&
      this.coverImageId !== null &&
      this.authorId > 0 &&
      this.content.length > 0
    );
  }

  publish(): void {
    if (!this.canPublish()) {
      throw new ArticleValidationError('Article cannot be published: missing required fields');
    }
    this.status = EArticleStatus.published;
    this.publishedAt = new Date();
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


#### Author Entity

```typescript
// domain/entities/author.entity.ts
export class Author {
  public readonly id?: number;
  public firstName: string;
  public lastName: string;
  public biography: string | null;
  public avatarId: number | null;
  public tenantId: number;
  public active: boolean;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  constructor(data: {
    id?: number;
    firstName: string;
    lastName: string;
    biography?: string | null;
    avatarId?: number | null;
    tenantId: number;
    active?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = data.id;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.biography = data.biography ?? null;
    this.avatarId = data.avatarId ?? null;
    this.tenantId = data.tenantId;
    this.active = data.active ?? true;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  validateNames(): boolean {
    return this.firstName.length > 0 && this.lastName.length > 0;
  }
}
```

### Value Objects

#### SEO Metadata Value Object

```typescript
// domain/value-objects/seo-metadata.vo.ts
export class SeoMetadata {
  private readonly metaTitle: string;
  private readonly metaDescription: string | null;
  private readonly focusKeyword: string | null;

  constructor(data: {
    metaTitle: string;
    metaDescription?: string | null;
    focusKeyword?: string | null;
  }) {
    if (data.metaTitle.length > 60) {
      throw new DomainException('meta_title cannot exceed 60 characters');
    }
    
    if (data.metaDescription && data.metaDescription.length > 160) {
      throw new DomainException('meta_description cannot exceed 160 characters');
    }

    this.metaTitle = data.metaTitle;
    this.metaDescription = data.metaDescription ?? null;
    this.focusKeyword = data.focusKeyword ?? null;
  }

  getMetaTitle(): string {
    return this.metaTitle;
  }

  getMetaDescription(): string | null {
    return this.metaDescription;
  }

  getFocusKeyword(): string | null {
    return this.focusKeyword;
  }
}
```

#### Slug Value Object

```typescript
// domain/value-objects/slug.vo.ts
export class Slug {
  private readonly value: string;

  constructor(slug: string) {
    if (!Slug.isValid(slug)) {
      throw new DomainException(`Invalid slug: ${slug}`);
    }
    this.value = slug.toLowerCase().trim();
  }

  static isValid(slug: string): boolean {
    // URL-safe: lowercase letters, numbers, hyphens only
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  }

  static fromString(text: string): Slug {
    const slugified = text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    return new Slug(slugified);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Slug): boolean {
    return this.value === other.value;
  }
}
```

### Repository Interfaces

```typescript
// domain/interfaces/article.repository.interface.ts
export const ARTICLE_REPOSITORY = Symbol('ARTICLE_REPOSITORY');

export interface IArticleRepository {
  create(article: Article): Promise<Article>;
  findById(id: number): Promise<Article | null>;
  findBySlugAndBlogId(slug: string, blogId: number): Promise<Article | null>;
  findByBlogId(blogId: number, filters?: ArticleFilters): Promise<PaginatedResult<Article>>;
  update(id: number, data: Partial<Article>): Promise<Article>;
  delete(id: number): Promise<void>;
  countByAuthorId(authorId: number, status?: EArticleStatus): Promise<number>;
}

// domain/interfaces/author.repository.interface.ts
export const AUTHOR_REPOSITORY = Symbol('AUTHOR_REPOSITORY');

export interface IAuthorRepository {
  create(author: Author): Promise<Author>;
  findById(id: number): Promise<Author | null>;
  findByTenantId(tenantId: number, filters?: AuthorFilters): Promise<PaginatedResult<Author>>;
  update(id: number, data: Partial<Author>): Promise<Author>;
  delete(id: number): Promise<void>;
  hasPublishedArticles(authorId: number): Promise<boolean>;
}

// domain/interfaces/blog.repository.interface.ts
export const BLOG_REPOSITORY = Symbol('BLOG_REPOSITORY');

export interface IBlogRepository {
  create(blog: Blog): Promise<Blog>;
  findById(id: number): Promise<Blog | null>;
  findByNameAndTenantId(name: string, tenantId: number): Promise<Blog | null>;
  findByTenantId(tenantId: number): Promise<Blog[]>;
  update(id: number, data: Partial<Blog>): Promise<Blog>;
  delete(id: number): Promise<void>;
}
```


## Data Models

### Updated Prisma Schema

```prisma
// Blog model - id changed to UUID, slug field removed
model Blog {
  id              String    @id @default(cuid()) @db.VarChar(12)
  name            String    @db.VarChar(150)
  description     String?
  secret_key_hash String
  secret_key_salt String
  tenant_id       Int
  active          Boolean   @default(true)
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt
  Tenant          Tenant    @relation(fields: [tenant_id], references: [id])
  Article         Article[]

  @@unique([name, tenant_id])
  @@index([tenant_id])
}

// Article model - refactored with new fields, blog_id now references UUID
model Article {
  id                Int            @id @default(autoincrement())
  display_title     String         @db.VarChar(255)
  meta_title        String         @db.VarChar(60)
  meta_description  String?        @db.VarChar(160)
  focus_keyword     String?        @db.VarChar(100)
  content           String
  slug              String         @db.VarChar(255)
  status            EArticleStatus @default(draft)
  display_order     Int            @default(0)
  published_at      DateTime?
  cover_image_id    Int?
  author_id         Int
  blog_id           String         @db.VarChar(12) // UUID reference
  created_by        Int
  last_edited_by    Int?
  created_at        DateTime       @default(now())
  updated_at        DateTime       @updatedAt
  
  Blog              Blog           @relation(fields: [blog_id], references: [id], onDelete: Cascade)
  CoverImage        MediaAsset?    @relation("ArticleCoverImage", fields: [cover_image_id], references: [id])
  Author            Author         @relation(fields: [author_id], references: [id])
  CreatedByAdmin    Admin          @relation("ArticleCreatedBy", fields: [created_by], references: [id])
  LastEditedByAdmin Admin?         @relation("ArticleLastEditedBy", fields: [last_edited_by], references: [id])

  @@unique([slug, blog_id])
  @@index([blog_id, status, display_order])
  @@index([author_id])
  @@index([created_by])
  @@index([last_edited_by])
}

// New Author model
model Author {
  id         Int       @id @default(autoincrement())
  first_name String    @db.VarChar(100)
  last_name  String    @db.VarChar(100)
  biography  String?   @db.Text
  avatar_id  Int?
  tenant_id  Int
  active     Boolean   @default(true)
  created_at DateTime  @default(now())
  updated_at DateTime  @updatedAt
  
  Avatar     MediaAsset? @relation(fields: [avatar_id], references: [id])
  Tenant     Tenant      @relation(fields: [tenant_id], references: [id])
  Article    Article[]

  @@index([tenant_id])
  @@index([active])
}

// ArticleImage model - DEPRECATED, kept for migration
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
  @@map("article_images_deprecated")
}

// Admin model - add relations for article audit
model Admin {
  id                     Int                 @id @default(autoincrement())
  name                   String              @db.VarChar(100)
  email                  String              @unique
  role                   EAdminRole          @default(company_admin)
  active                 Boolean             @default(true)
  created_at             DateTime            @default(now())
  updated_at             DateTime            @updatedAt
  
  AdminSessionToken      AdminSessionToken[]
  AdminCredential        AdminCredential?
  AdminTenant            AdminTenant[]
  ArticlesCreated        Article[]           @relation("ArticleCreatedBy")
  ArticlesLastEdited     Article[]           @relation("ArticleLastEditedBy")
}

// MediaAsset - add relation for article cover images and author avatars
model MediaAsset {
  id                     Int                   @id @default(autoincrement())
  url                    String                @db.VarChar(500)
  storage_key            String                @db.VarChar(500)
  filename               String                @db.VarChar(255)
  mime_type              String                @db.VarChar(100)
  file_size              Int
  width                  Int?
  height                 Int?
  alt_text               String?               @db.VarChar(255)
  metadata               Json?
  status                 String                @default("ready") @db.VarChar(20)
  collection_id          Int
  tenant_id              Int
  created_by             Int
  created_at             DateTime              @default(now())
  updated_at             DateTime              @updatedAt
  
  collection             MediaCollection       @relation(fields: [collection_id], references: [id], onDelete: Cascade)
  relations              MediaAssetRelation[]
  LeadAttachment         LeadAttachment[]
  ArticleCoverImages     Article[]             @relation("ArticleCoverImage")
  AuthorAvatars          Author[]
  
  @@index([collection_id])
  @@index([tenant_id])
  @@index([created_by])
  @@index([status])
  @@map("media_assets")
}
```

### MediaAssetRelation Usage

For article images, the system will use MediaAssetRelation with these patterns:

- **Cover Image**: `entity_type = 'article'`, `relation_type = 'cover'`, `entity_id = article.id`
- **Content Images**: `entity_type = 'article'`, `relation_type = 'content-image'`, `entity_id = article.id`, `display_order` indicates position

### Migration Strategy

The migration will follow these steps:

1. **Generate UUIDs for existing blogs**: Create 12-character UUIDs for all existing Blog records
2. **Add temporary blog_id_uuid column** to Article table
3. **Populate blog_id_uuid** by mapping Article.blog_id (Int) to Blog UUID values
4. **Add new columns** to Article (display_title, meta_description, focus_keyword, cover_image_id, author_id, created_by, last_edited_by)
5. **Copy data**: Article.title → Article.meta_title AND Article.display_title
6. **Create default Author** for existing articles (system author per tenant)
7. **Set created_by** to a default admin or first admin per tenant
8. **Migrate ArticleImage** to MediaAsset + MediaAssetRelation
9. **Drop old Article.blog_id (Int)** and rename blog_id_uuid to blog_id
10. **Change Blog.id from Int to String** and update all references
11. **Remove Blog.slug** column after verifying no code dependencies
12. **Rename ArticleImage** table to article_images_deprecated


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Blog Name Uniqueness Per Tenant

*For any* two blogs within the same tenant, their names must be unique. Attempting to create a blog with a duplicate name and tenant_id combination should fail with a unique constraint violation.

**Validates: Requirements 1.2**

### Property 2: Article Slug Uniqueness Per Blog

*For any* two articles within the same blog, their slugs must be unique. Attempting to create an article with a duplicate slug within the same blog should fail with a unique constraint violation.

**Validates: Requirements 2.2**

### Property 3: Slug URL Safety

*For any* article slug, it must contain only lowercase letters, numbers, and hyphens, with no consecutive hyphens or leading/trailing hyphens. Invalid slugs should be rejected during validation.

**Validates: Requirements 2.3**

### Property 4: Published Article Slug Immutability

*For any* article with status 'published', attempting to change its slug should fail with a validation error to maintain URL stability.

**Validates: Requirements 2.4**

### Property 5: Publishing Requires Complete Fields

*For any* article being published, the operation should fail if any required field (display_title, meta_title, cover_image_id, author_id, content) is missing or empty. The validation error should clearly indicate which fields are incomplete.

**Validates: Requirements 3.2, 9.1, 9.2, 9.3, 9.4, 9.5, 9.7**

### Property 6: Image Assignment Creates Relations

*For any* image assigned to an article (whether as cover or content image), a corresponding MediaAssetRelation record should be created with the appropriate relation_type ('cover' or 'content-image').

**Validates: Requirements 3.3, 7.2**

### Property 7: Referenced Entity Deletion Prevention

*For any* MediaAsset or Author referenced by published articles, attempting to delete the entity should fail with a referential integrity error.

**Validates: Requirements 3.4, 5.7**

### Property 8: SEO Metadata Length Constraints

*For any* article, the meta_title must not exceed 60 characters and meta_description must not exceed 160 characters. Values exceeding these limits should be rejected during validation.

**Validates: Requirements 4.6, 4.7**

### Property 9: Author Tenant Matching

*For any* article, the author's tenant_id must match the blog's tenant_id. Attempting to assign an author from a different tenant should fail with a validation error.

**Validates: Requirements 5.4**

### Property 10: Article Creation Requires Author

*For any* article creation attempt, a valid author_id must be provided. Attempting to create an article without an author should fail with a validation error.

**Validates: Requirements 5.5**

### Property 11: Admin Audit Trail Updates

*For any* article operation (create or update), the system should set created_by on creation and update last_edited_by on modification to the current admin user's ID.

**Validates: Requirements 6.3, 6.4**

### Property 12: Markdown Image Reference Validation

*For any* article being published, all image references in the markdown content must point to existing MediaAsset records. Publishing should fail if any image reference is invalid.

**Validates: Requirements 7.4**

### Property 13: Markdown Image Syntax Support

*For any* valid markdown image syntax (`![alt](storage_key)` or `![alt](url)`), the system should correctly parse and extract the image reference for validation and relation creation.

**Validates: Requirements 7.5**

### Property 14: Content Image Display Order

*For any* article with multiple content images, the MediaAssetRelation display_order should reflect the sequential position of images in the markdown content.

**Validates: Requirements 7.3**

### Property 15: ArticleImage Migration Preservation

*For any* ArticleImage record being migrated, all fields (url, storage_key, alt_text, display_order, file_size) should be preserved in the corresponding MediaAsset record.

**Validates: Requirements 8.3**

### Property 16: Collection-Based Image Routing

*For any* image upload, the system should assign it to the appropriate MediaCollection based on usage type: 'article-images' for cover and content images, 'author-avatars' for author profile images.

**Validates: Requirements 11.3, 11.4**

### Property 17: Collection Type Constraint Enforcement

*For any* file upload to a MediaCollection with type constraints, the system should validate that the file's mime_type matches the collection's allowed types. Non-conforming uploads should be rejected.

**Validates: Requirements 11.5**


## Error Handling

### Domain Errors

```typescript
// domain/errors/article-validation.error.ts
export class ArticleValidationError extends DomainException {
  constructor(message: string, public readonly missingFields?: string[]) {
    super(message);
    this.name = 'ArticleValidationError';
  }
}

// domain/errors/author-not-found.error.ts
export class AuthorNotFoundError extends DomainException {
  constructor(authorId: number) {
    super(`Author with ID ${authorId} not found`);
    this.name = 'AuthorNotFoundError';
  }
}

// domain/errors/slug-immutable.error.ts
export class SlugImmutableError extends DomainException {
  constructor(articleId: number) {
    super(`Cannot change slug for published article ${articleId}`);
    this.name = 'SlugImmutableError';
  }
}

// domain/errors/tenant-mismatch.error.ts
export class TenantMismatchError extends DomainException {
  constructor(message: string) {
    super(message);
    this.name = 'TenantMismatchError';
  }
}
```

### Error Constants

```typescript
// application/constants/error-constants.ts
export const ERROR_ARTICLE_NOT_FOUND = '404:Article not found';
export const ERROR_ARTICLE_CANNOT_PUBLISH = '400:Article cannot be published: missing required fields';
export const ERROR_ARTICLE_SLUG_DUPLICATE = '409:Article slug already exists in this blog';
export const ERROR_ARTICLE_SLUG_IMMUTABLE = '400:Cannot change slug for published article';
export const ERROR_AUTHOR_NOT_FOUND = '404:Author not found';
export const ERROR_AUTHOR_HAS_PUBLISHED_ARTICLES = '400:Cannot delete author with published articles';
export const ERROR_AUTHOR_TENANT_MISMATCH = '400:Author must belong to the same tenant as the blog';
export const ERROR_BLOG_NOT_FOUND = '404:Blog not found';
export const ERROR_BLOG_NAME_DUPLICATE = '409:Blog name already exists for this tenant';
export const ERROR_COVER_IMAGE_REQUIRED = '400:Cover image is required for published articles';
export const ERROR_COVER_IMAGE_IN_USE = '400:Cannot delete cover image used by published articles';
export const ERROR_INVALID_SLUG = '400:Slug must be URL-safe (lowercase letters, numbers, hyphens only)';
export const ERROR_INVALID_IMAGE_REFERENCE = '400:Article contains invalid image references';
export const ERROR_META_TITLE_TOO_LONG = '400:Meta title cannot exceed 60 characters';
export const ERROR_META_DESCRIPTION_TOO_LONG = '400:Meta description cannot exceed 160 characters';
export const ERROR_COLLECTION_TYPE_MISMATCH = '400:File type not allowed in this collection';
```

### Service Response Pattern

All services return `ServiceResponse<T>`:

```typescript
interface ServiceResponse<T = unknown> {
  status: number;
  data: T | { code: string; message?: string; details?: unknown };
}

// Success response
return successResponse(article, 201);

// Error response
return errorResponse(ERROR_ARTICLE_CANNOT_PUBLISH, 400, { 
  missingFields: ['cover_image_id', 'author_id'] 
});
```

### Exception Handling Flow

1. **Domain Layer**: Throws domain-specific errors (ArticleValidationError, AuthorNotFoundError)
2. **Application Layer**: Catches domain errors, converts to ServiceResponse with appropriate HTTP status
3. **Infrastructure Layer**: Returns ServiceResponse to controller, which sends HTTP response


## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, migration scripts, and integration points
- **Property tests**: Verify universal properties across randomized inputs

### Unit Testing Focus

Unit tests should cover:

1. **Migration Scripts**
   - Blog.slug removal preserves all records
   - Article.title → meta_title + display_title data copy
   - ArticleImage → MediaAsset + MediaAssetRelation conversion
   - Default author creation for existing articles
   - Rollback migration functionality

2. **Edge Cases**
   - Empty string handling in optional fields
   - Null vs undefined in nullable fields
   - Maximum length boundary values (59, 60, 61 characters for meta_title)
   - Special characters in slugs and titles

3. **Integration Points**
   - MediaAsset creation and relation linking
   - Admin audit trail updates
   - Prisma transaction handling
   - Foreign key constraint enforcement

4. **Specific Examples**
   - Creating a draft article without cover image (should succeed)
   - Creating a published article without cover image (should fail)
   - Deleting an author with no articles (should succeed)
   - Deleting an author with published articles (should fail)

### Property-Based Testing Focus

Property tests should verify universal behaviors across randomized inputs:

1. **Uniqueness Constraints**
   - Property 1: Blog name uniqueness per tenant
   - Property 2: Article slug uniqueness per blog

2. **Validation Rules**
   - Property 3: Slug URL safety
   - Property 5: Publishing requires complete fields
   - Property 8: SEO metadata length constraints
   - Property 12: Markdown image reference validation

3. **Business Rules**
   - Property 4: Published article slug immutability
   - Property 7: Referenced entity deletion prevention
   - Property 9: Author tenant matching
   - Property 10: Article creation requires author

4. **Side Effects**
   - Property 6: Image assignment creates relations
   - Property 11: Admin audit trail updates
   - Property 14: Content image display order
   - Property 16: Collection-based image routing

### Property Test Configuration

- **Minimum iterations**: 100 per property test
- **Test framework**: Jest with fast-check library for property-based testing
- **Tag format**: Each test must include a comment:
  ```typescript
  // Feature: cms-blog-article-refactor, Property 5: Publishing requires complete fields
  ```

### Test Organization

```
src/modules/zarp-cms/
├── domain/
│   ├── entities/
│   │   ├── article.entity.spec.ts          # Unit tests for domain logic
│   │   └── author.entity.spec.ts
│   └── value-objects/
│       ├── seo-metadata.vo.spec.ts
│       └── slug.vo.spec.ts
├── application/
│   └── services/
│       ├── article.service.spec.ts         # Unit tests for service logic
│       ├── article.service.property.spec.ts # Property tests
│       └── author.service.spec.ts
└── infrastructure/
    ├── repositories/
    │   ├── prisma-article.repository.spec.ts # Integration tests with test DB
    │   └── prisma-author.repository.spec.ts
    └── migrations/
        └── migration.spec.ts                 # Migration validation tests
```

### Example Property Test

```typescript
// application/services/article.service.property.spec.ts
import fc from 'fast-check';

describe('ArticleService - Property Tests', () => {
  // Feature: cms-blog-article-refactor, Property 5: Publishing requires complete fields
  it('should fail to publish any article missing required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          displayTitle: fc.option(fc.string(), { nil: undefined }),
          metaTitle: fc.option(fc.string(), { nil: undefined }),
          coverImageId: fc.option(fc.integer({ min: 1 }), { nil: undefined }),
          authorId: fc.option(fc.integer({ min: 1 }), { nil: undefined }),
          content: fc.option(fc.string(), { nil: undefined }),
        }),
        async (articleData) => {
          // Skip if all fields are present (valid case)
          const hasAllFields = 
            articleData.displayTitle &&
            articleData.metaTitle &&
            articleData.coverImageId &&
            articleData.authorId &&
            articleData.content;
          
          if (hasAllFields) return;

          const result = await articleService.publish(articleData);
          
          expect(result.status).toBe(400);
          expect(result.data).toHaveProperty('missingFields');
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Testing Checklist

- [ ] All 17 correctness properties have corresponding property tests
- [ ] Migration scripts have unit tests with before/after data validation
- [ ] Edge cases for field length limits are covered
- [ ] Integration tests verify Prisma relationships work correctly
- [ ] Rollback migrations are tested
- [ ] Error messages are validated for clarity
- [ ] MediaAssetRelation creation is verified in tests
- [ ] Admin audit trail updates are verified in tests

