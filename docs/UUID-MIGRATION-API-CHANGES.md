# UUID Migration - API Breaking Changes Documentation

## Overview

This document details all breaking changes introduced by the UUID migration in the CMS module. All entity IDs have been migrated from integer (`Int`) to string UUID (`String` with 12-character cuid format).

**Migration Date**: TBD (See Migration Timeline section)  
**API Version**: v2  
**Affected Module**: `zarp-cms` (Blog, Article, Author, MediaAsset, MediaCollection, MediaAssetRelation)

---

## Executive Summary

### What Changed
- All CMS entity IDs changed from integer to 12-character UUID string
- All foreign key references updated to UUID format
- All API endpoints now accept/return UUID strings instead of integers

### UUID Format
- **Type**: String (12 characters)
- **Generator**: `cuid()` - Collision-resistant unique identifier
- **Pattern**: Alphanumeric, case-insensitive
- **Example**: `"ckl1234abcd5"`

### Affected Entities
1. **Blog** - `id`
2. **Article** - `id`, `blog_id`, `author_id`, `cover_image_id`
3. **Author** - `id`, `avatar_id`
4. **MediaAsset** - `id`, `collection_id`
5. **MediaCollection** - `id`
6. **MediaAssetRelation** - `id`, `asset_id`

---

## Breaking Changes by Entity

### 1. Blog Entity

#### Schema Changes
```typescript
// BEFORE
{
  id: number;              // Integer autoincrement
  name: string;
  slug: string;            // REMOVED
  // ... other fields
}

// AFTER
{
  id: string;              // UUID (12 characters)
  name: string;
  // slug field removed
  // ... other fields
}
```

#### API Endpoint Changes

##### GET /api/v2/cms/blogs/:id

**Before:**
```http
GET /api/v2/cms/blogs/123
```

**After:**
```http
GET /api/v2/cms/blogs/ckl1234abcd5
```

**Response Before:**
```json
{
  "id": 123,
  "name": "Tech Blog",
  "slug": "tech-blog",
  "description": "Technology articles",
  "tenant_id": 1,
  "active": true,
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

**Response After:**
```json
{
  "id": "ckl1234abcd5",
  "name": "Tech Blog",
  "description": "Technology articles",
  "tenant_id": 1,
  "active": true,
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

**Key Changes:**
- ✅ `id` is now a string UUID
- ❌ `slug` field removed from response

##### POST /api/v2/cms/blogs

**Request Before:**
```json
{
  "name": "Tech Blog",
  "description": "Technology articles",
  "secret_key": "my-secret-key"
}
```

**Request After:**
```json
{
  "name": "Tech Blog",
  "description": "Technology articles",
  "secret_key": "my-secret-key"
}
```

**Response Before:**
```json
{
  "id": 124,
  "name": "Tech Blog",
  "slug": "tech-blog",
  // ...
}
```

**Response After:**
```json
{
  "id": "ckl5678efgh9",
  "name": "Tech Blog",
  // ...
}
```

##### PUT /api/v2/cms/blogs/:id

**Before:**
```http
PUT /api/v2/cms/blogs/123
```

**After:**
```http
PUT /api/v2/cms/blogs/ckl1234abcd5
```

##### DELETE /api/v2/cms/blogs/:id

**Before:**
```http
DELETE /api/v2/cms/blogs/123
```

**After:**
```http
DELETE /api/v2/cms/blogs/ckl1234abcd5
```

---

### 2. Article Entity

#### Schema Changes
```typescript
// BEFORE
{
  id: number;              // Integer autoincrement
  blog_id: number;         // Integer FK
  author_id: number;       // Integer FK
  cover_image_id: number;  // Integer FK
  // ... other fields
}

// AFTER
{
  id: string;              // UUID (12 characters)
  blog_id: string;         // UUID FK
  author_id: string;       // UUID FK
  cover_image_id: string;  // UUID FK
  // ... other fields
}
```

#### API Endpoint Changes

##### GET /api/v2/cms/articles/:id

**Before:**
```http
GET /api/v2/cms/articles/456
```

**After:**
```http
GET /api/v2/cms/articles/ckl9012ijkl3
```

**Response Before:**
```json
{
  "id": 456,
  "display_title": "Getting Started with TypeScript",
  "meta_title": "TypeScript Guide 2024",
  "meta_description": "Complete guide to TypeScript",
  "focus_keyword": "typescript",
  "content": "# Introduction\n\nTypeScript is...",
  "slug": "getting-started-typescript",
  "status": "published",
  "display_order": 1,
  "published_at": "2024-01-20T14:30:00Z",
  "cover_image_id": 789,
  "author_id": 101,
  "blog_id": 123,
  "created_by": 1,
  "last_edited_by": 1,
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-20T14:30:00Z"
}
```

**Response After:**
```json
{
  "id": "ckl9012ijkl3",
  "display_title": "Getting Started with TypeScript",
  "meta_title": "TypeScript Guide 2024",
  "meta_description": "Complete guide to TypeScript",
  "focus_keyword": "typescript",
  "content": "# Introduction\n\nTypeScript is...",
  "slug": "getting-started-typescript",
  "status": "published",
  "display_order": 1,
  "published_at": "2024-01-20T14:30:00Z",
  "cover_image_id": "cklabcdefgh1",
  "author_id": "cklmnopqrst2",
  "blog_id": "ckl1234abcd5",
  "created_by": 1,
  "last_edited_by": 1,
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-20T14:30:00Z"
}
```

**Key Changes:**
- ✅ `id` is now a string UUID
- ✅ `blog_id` is now a string UUID
- ✅ `author_id` is now a string UUID
- ✅ `cover_image_id` is now a string UUID
- ⚠️ `created_by` and `last_edited_by` remain integers (Admin IDs not migrated)

##### GET /api/v2/cms/blogs/:blogId/articles

**Before:**
```http
GET /api/v2/cms/blogs/123/articles?page=1&limit=10
```

**After:**
```http
GET /api/v2/cms/blogs/ckl1234abcd5/articles?page=1&limit=10
```

**Response Before:**
```json
{
  "data": [
    {
      "id": 456,
      "blog_id": 123,
      "author_id": 101,
      // ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

**Response After:**
```json
{
  "data": [
    {
      "id": "ckl9012ijkl3",
      "blog_id": "ckl1234abcd5",
      "author_id": "cklmnopqrst2",
      // ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

##### GET /api/v2/cms/blogs/:blogId/articles/:slug

**Before:**
```http
GET /api/v2/cms/blogs/123/articles/getting-started-typescript
```

**After:**
```http
GET /api/v2/cms/blogs/ckl1234abcd5/articles/getting-started-typescript
```

##### POST /api/v2/cms/articles

**Request Before:**
```json
{
  "display_title": "New Article",
  "meta_title": "New Article SEO",
  "content": "Article content...",
  "slug": "new-article",
  "blog_id": 123,
  "author_id": 101,
  "cover_image_id": 789,
  "status": "draft"
}
```

**Request After:**
```json
{
  "display_title": "New Article",
  "meta_title": "New Article SEO",
  "content": "Article content...",
  "slug": "new-article",
  "blog_id": "ckl1234abcd5",
  "author_id": "cklmnopqrst2",
  "cover_image_id": "cklabcdefgh1",
  "status": "draft"
}
```

**Key Changes:**
- ✅ `blog_id` must be a valid UUID string
- ✅ `author_id` must be a valid UUID string
- ✅ `cover_image_id` must be a valid UUID string (if provided)

##### PUT /api/v2/cms/articles/:id

**Before:**
```http
PUT /api/v2/cms/articles/456
```

**After:**
```http
PUT /api/v2/cms/articles/ckl9012ijkl3
```

##### DELETE /api/v2/cms/articles/:id

**Before:**
```http
DELETE /api/v2/cms/articles/456
```

**After:**
```http
DELETE /api/v2/cms/articles/ckl9012ijkl3
```

---

### 3. Author Entity

#### Schema Changes
```typescript
// BEFORE
{
  id: number;              // Integer autoincrement
  avatar_id: number;       // Integer FK
  // ... other fields
}

// AFTER
{
  id: string;              // UUID (12 characters)
  avatar_id: string;       // UUID FK
  // ... other fields
}
```

#### API Endpoint Changes

##### GET /api/v2/cms/authors/:id

**Before:**
```http
GET /api/v2/cms/authors/101
```

**After:**
```http
GET /api/v2/cms/authors/cklmnopqrst2
```

**Response Before:**
```json
{
  "id": 101,
  "first_name": "João",
  "last_name": "Silva",
  "biography": "Senior developer with 10 years experience",
  "avatar_id": 789,
  "tenant_id": 1,
  "active": true,
  "created_at": "2024-01-10T09:00:00Z",
  "updated_at": "2024-01-10T09:00:00Z"
}
```

**Response After:**
```json
{
  "id": "cklmnopqrst2",
  "first_name": "João",
  "last_name": "Silva",
  "biography": "Senior developer with 10 years experience",
  "avatar_id": "cklabcdefgh1",
  "tenant_id": 1,
  "active": true,
  "created_at": "2024-01-10T09:00:00Z",
  "updated_at": "2024-01-10T09:00:00Z"
}
```

##### POST /api/v2/cms/authors

**Request Before:**
```json
{
  "first_name": "Maria",
  "last_name": "Santos",
  "biography": "Content writer",
  "avatar_id": 790
}
```

**Request After:**
```json
{
  "first_name": "Maria",
  "last_name": "Santos",
  "biography": "Content writer",
  "avatar_id": "ckluvwxyz123"
}
```

---

### 4. MediaAsset Entity

#### Schema Changes
```typescript
// BEFORE
{
  id: number;              // Integer autoincrement
  collection_id: number;   // Integer FK
  // ... other fields
}

// AFTER
{
  id: string;              // UUID (12 characters)
  collection_id: string;   // UUID FK
  // ... other fields
}
```

#### API Endpoint Changes

##### GET /api/v2/cms/media/assets/:id

**Before:**
```http
GET /api/v2/cms/media/assets/789
```

**After:**
```http
GET /api/v2/cms/media/assets/cklabcdefgh1
```

**Response Before:**
```json
{
  "id": 789,
  "url": "https://s3.amazonaws.com/bucket/image.jpg",
  "storage_key": "uploads/2024/01/image.jpg",
  "filename": "image.jpg",
  "mime_type": "image/jpeg",
  "file_size": 245678,
  "width": 1920,
  "height": 1080,
  "alt_text": "Sample image",
  "status": "ready",
  "collection_id": 10,
  "tenant_id": 1,
  "created_by": 1,
  "created_at": "2024-01-15T11:00:00Z",
  "updated_at": "2024-01-15T11:00:00Z"
}
```

**Response After:**
```json
{
  "id": "cklabcdefgh1",
  "url": "https://s3.amazonaws.com/bucket/image.jpg",
  "storage_key": "uploads/2024/01/image.jpg",
  "filename": "image.jpg",
  "mime_type": "image/jpeg",
  "file_size": 245678,
  "width": 1920,
  "height": 1080,
  "alt_text": "Sample image",
  "status": "ready",
  "collection_id": "cklcollect99",
  "tenant_id": 1,
  "created_by": 1,
  "created_at": "2024-01-15T11:00:00Z",
  "updated_at": "2024-01-15T11:00:00Z"
}
```

##### POST /api/v2/cms/media/assets (Upload)

**Request Before:**
```http
POST /api/v2/cms/media/assets
Content-Type: multipart/form-data

collection_id=10
file=<binary>
alt_text=Sample image
```

**Request After:**
```http
POST /api/v2/cms/media/assets
Content-Type: multipart/form-data

collection_id=cklcollect99
file=<binary>
alt_text=Sample image
```

---

### 5. MediaCollection Entity

#### Schema Changes
```typescript
// BEFORE
{
  id: number;              // Integer autoincrement
  // ... other fields
}

// AFTER
{
  id: string;              // UUID (12 characters)
  // ... other fields
}
```

#### API Endpoint Changes

##### GET /api/v2/cms/media/collections/:id

**Before:**
```http
GET /api/v2/cms/media/collections/10
```

**After:**
```http
GET /api/v2/cms/media/collections/cklcollect99
```

**Response Before:**
```json
{
  "id": 10,
  "name": "Article Images",
  "slug": "article-images",
  "description": "Images for blog articles",
  "type": "image",
  "max_file_size": 5242880,
  "allowed_mime_types": "[\"image/jpeg\",\"image/png\",\"image/webp\"]",
  "max_items": null,
  "tenant_id": 1,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**Response After:**
```json
{
  "id": "cklcollect99",
  "name": "Article Images",
  "slug": "article-images",
  "description": "Images for blog articles",
  "type": "image",
  "max_file_size": 5242880,
  "allowed_mime_types": "[\"image/jpeg\",\"image/png\",\"image/webp\"]",
  "max_items": null,
  "tenant_id": 1,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

---

### 6. MediaAssetRelation Entity

#### Schema Changes
```typescript
// BEFORE
{
  id: number;              // Integer autoincrement
  asset_id: number;        // Integer FK
  entity_id: string;       // Polymorphic (could be Int or String)
  // ... other fields
}

// AFTER
{
  id: string;              // UUID (12 characters)
  asset_id: string;        // UUID FK
  entity_id: string;       // Polymorphic (Int or UUID as string)
  entity_id_type: string;  // NEW: 'int' or 'uuid'
  // ... other fields
}
```

#### API Endpoint Changes

##### GET /api/v2/cms/media/relations

**Query Parameters:**
- `entity_type` - Entity type (e.g., 'article', 'author')
- `entity_id` - Entity ID (now accepts UUID strings)

**Before:**
```http
GET /api/v2/cms/media/relations?entity_type=article&entity_id=456
```

**After:**
```http
GET /api/v2/cms/media/relations?entity_type=article&entity_id=ckl9012ijkl3
```

**Response Before:**
```json
{
  "data": [
    {
      "id": 1001,
      "asset_id": 789,
      "entity_type": "article",
      "entity_id": "456",
      "relation_type": "cover",
      "display_order": null,
      "created_at": "2024-01-15T12:00:00Z"
    }
  ]
}
```

**Response After:**
```json
{
  "data": [
    {
      "id": "cklrelation1",
      "asset_id": "cklabcdefgh1",
      "entity_type": "article",
      "entity_id": "ckl9012ijkl3",
      "entity_id_type": "uuid",
      "relation_type": "cover",
      "display_order": null,
      "created_at": "2024-01-15T12:00:00Z"
    }
  ]
}
```

**Key Changes:**
- ✅ `id` is now a string UUID
- ✅ `asset_id` is now a string UUID
- ✅ `entity_id` now contains UUID for CMS entities
- ✅ NEW `entity_id_type` field indicates ID format ('int' or 'uuid')

---

## Validation Rules

### UUID Format Validation

All UUID fields must conform to the following rules:

```typescript
// Valid UUID format
const UUID_REGEX = /^[a-z0-9]{12}$/i;

// Examples
"ckl1234abcd5"  // ✅ Valid
"CKL1234ABCD5"  // ✅ Valid (case-insensitive)
"ckl1234"       // ❌ Invalid (too short)
"ckl1234abcd56" // ❌ Invalid (too long)
"ckl-1234-abcd" // ❌ Invalid (contains hyphens)
"123"           // ❌ Invalid (integer)
```

### Error Responses

#### Invalid UUID Format

**Request:**
```http
GET /api/v2/cms/articles/123
```

**Response:**
```json
{
  "statusCode": 400,
  "message": "Invalid UUID format for article ID",
  "error": "Bad Request",
  "details": {
    "field": "id",
    "value": "123",
    "expected": "12-character UUID string (e.g., 'ckl1234abcd5')"
  }
}
```

#### UUID Not Found

**Request:**
```http
GET /api/v2/cms/articles/cklnotfound1
```

**Response:**
```json
{
  "statusCode": 404,
  "message": "Article not found",
  "error": "Not Found",
  "details": {
    "id": "cklnotfound1"
  }
}
```

---

## Migration Timeline

### Phase 1: Pre-Migration (Week 1)
- ✅ Schema changes deployed to staging
- ✅ Data migration scripts tested
- ✅ API documentation updated
- ✅ Frontend migration guide published

### Phase 2: Migration Window (Week 2)
- **Day 1**: Database migration executed
- **Day 2-3**: API endpoints updated
- **Day 4-5**: Validation and testing

### Phase 3: Post-Migration (Week 3)
- Frontend applications updated
- Legacy integer ID support removed
- Monitoring and issue resolution

### Rollback Window
- **Available**: First 48 hours after migration
- **Procedure**: See Rollback Procedures section

---

## Backward Compatibility

### ⚠️ No Backward Compatibility

This is a **breaking change** with **no backward compatibility**. Integer IDs will not be accepted after migration.

### Migration Period

There is **no grace period** where both integer and UUID IDs are accepted. All clients must update simultaneously with the API migration.

### Recommended Approach

1. **Test in staging environment** with migrated data
2. **Update all frontend applications** before production migration
3. **Deploy frontend and backend** in coordinated release
4. **Monitor for issues** in first 48 hours

---

## Testing Recommendations

### Unit Tests

Update all unit tests to use UUID strings:

```typescript
// BEFORE
const blogId = 123;
const articleId = 456;

// AFTER
const blogId = 'ckl1234abcd5';
const articleId = 'ckl9012ijkl3';
```

### Integration Tests

Update API integration tests:

```typescript
// BEFORE
const response = await request(app)
  .get('/api/v2/cms/articles/456');

// AFTER
const response = await request(app)
  .get('/api/v2/cms/articles/ckl9012ijkl3');
```

### E2E Tests

Update end-to-end tests to handle UUID responses:

```typescript
// BEFORE
expect(response.body.id).toBe(456);
expect(typeof response.body.id).toBe('number');

// AFTER
expect(response.body.id).toBe('ckl9012ijkl3');
expect(typeof response.body.id).toBe('string');
expect(response.body.id).toMatch(/^[a-z0-9]{12}$/i);
```

---

## Support and Questions

### Documentation Resources
- Frontend Migration Guide: `docs/UUID-FRONTEND-MIGRATION-GUIDE.md`
- Rollback Procedures: See section below
- Swagger Documentation: `/api/docs` (updated with UUID examples)

### Contact
- **Technical Questions**: [Your team contact]
- **Migration Issues**: [Support channel]
- **Emergency Rollback**: [On-call contact]

---

## Next Steps

1. ✅ Read this document completely
2. ✅ Review Frontend Migration Guide
3. ✅ Update your application code
4. ✅ Test in staging environment
5. ✅ Coordinate deployment with backend team
6. ✅ Monitor application after migration

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-25  
**Migration Status**: Pending
