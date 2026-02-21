# Frontend Integration Guide: CMS Blog Article Refactoring

## Overview

This guide documents the breaking changes and new features introduced in the CMS Blog Article Refactoring. The refactoring consolidates image management through the MediaAsset system, introduces proper SEO metadata fields, adds author management, and enhances audit trails.

**Target Audience**: Frontend developers integrating with the ZARP CMS API

**Migration Timeline**: This refactoring introduces breaking changes that require frontend updates

---

## Breaking Changes Summary

### 1. Blog Model Changes

**BREAKING**: The `Blog.slug` field has been **removed**. Blogs are now identified by UUID instead of slug.

**Before**:
```typescript
interface Blog {
  id: number;
  slug: string;  // REMOVED
  name: string;
  description: string | null;
  // ...
}
```

**After**:
```typescript
interface Blog {
  id: string;  // Changed from number to UUID (12 characters)
  name: string;
  description: string | null;
  // ...
}
```

**Migration Action**: Update all blog references to use `id` (UUID) instead of `slug`.

---

### 2. Article Model Changes

**BREAKING**: Multiple field changes in the Article model:


**Before**:
```typescript
interface Article {
  id: number;
  title: string;  // RENAMED
  content: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  blog_id: number;  // Changed to UUID
  // ...
}
```

**After**:
```typescript
interface Article {
  id: number;
  display_title: string;      // NEW - Human-readable title
  meta_title: string;          // RENAMED from 'title' - SEO title
  meta_description: string | null;  // NEW - SEO description
  focus_keyword: string | null;     // NEW - SEO keyword
  content: string;
  slug: string;                // RETAINED on Article
  status: 'draft' | 'published' | 'archived';
  cover_image_id: number | null;    // NEW - MediaAsset reference
  author_id: number;                // NEW - Author reference
  blog_id: string;             // Changed to UUID
  created_by: number;          // NEW - Admin who created
  last_edited_by: number | null;    // NEW - Admin who last edited
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
```

**Migration Actions**:
1. Replace `article.title` with `article.display_title` for display purposes
2. Use `article.meta_title` for SEO meta tags
3. Update `blog_id` references to expect UUID strings
4. Handle new required fields: `author_id`, `cover_image_id` (for published articles)

---

### 3. Image Management Changes

**BREAKING**: `ArticleImage` entity is **deprecated**. All images now use the `MediaAsset` system.

**Before**:
```typescript
interface ArticleImage {
  id: number;
  article_id: number;
  url: string;
  storage_key: string;
  alt_text: string | null;
  display_order: number;
  file_size: number;
}
```

**After**:
```typescript
// Cover image is now a direct reference
interface Article {
  cover_image_id: number | null;
  CoverImage?: MediaAsset;  // Populated via relation
}

// Content images use MediaAssetRelation
interface MediaAssetRelation {
  id: number;
  asset_id: number;
  entity_type: string;  // 'article'
  entity_id: number;    // article.id
  relation_type: string;  // 'cover' or 'content-image'
  display_order: number | null;
  metadata: any | null;
}

interface MediaAsset {
  id: number;
  url: string;
  storage_key: string;
  filename: string;
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  metadata: any | null;
  status: string;
  collection_id: number;
}
```

**Migration Actions**:
1. Update image queries to fetch `MediaAsset` instead of `ArticleImage`
2. Use `article.CoverImage` for the featured image
3. Query `MediaAssetRelation` with `entity_type='article'` and `relation_type='content-image'` for embedded images

---

## New Features

### 1. Author Entity

**NEW**: Articles now have dedicated author entities with biographical information.

```typescript
interface Author {
  id: number;
  first_name: string;
  last_name: string;
  biography: string | null;
  avatar_id: number | null;
  tenant_id: number;
  active: boolean;
  created_at: Date;
  updated_at: Date;
  
  // Relations
  Avatar?: MediaAsset;
}
```

**Usage**:
- Every article must have an `author_id`
- Authors can be shared across multiple articles
- Author avatars use the MediaAsset system

---

### 2. SEO Metadata Fields

**NEW**: Dedicated fields for search engine optimization.

```typescript
interface ArticleSEO {
  meta_title: string;           // Max 60 characters
  meta_description: string | null;  // Max 160 characters
  focus_keyword: string | null;     // Target SEO keyword
}
```

**Best Practices**:
- Use `meta_title` in `<title>` and `og:title` tags
- Use `meta_description` in meta description and `og:description` tags
- Use `display_title` for the visible article heading
- Keep `meta_title` under 60 characters for optimal display in search results
- Keep `meta_description` under 160 characters

---

### 3. Audit Trail

**NEW**: Track who created and edited articles.

```typescript
interface ArticleAudit {
  created_by: number;        // Admin ID who created
  last_edited_by: number | null;  // Admin ID who last edited
  created_at: Date;
  updated_at: Date;
}
```

---

## Field Mapping Guide

### Title Fields Migration

The `title` field has been split into two fields for better SEO control:

| Old Field | New Field | Purpose | Max Length | Required |
|-----------|-----------|---------|------------|----------|
| `title` | `display_title` | Human-readable title shown to readers | 255 | Yes |
| `title` | `meta_title` | SEO-optimized title for search engines | 60 | Yes |

**Migration Strategy**:
```typescript
// Old code
<h1>{article.title}</h1>
<title>{article.title}</title>

// New code
<h1>{article.display_title}</h1>
<title>{article.meta_title}</title>
<meta name="description" content={article.meta_description} />
```

---

### Blog ID Migration

Blog IDs changed from integer to UUID (12-character string):

| Old Type | New Type | Example |
|----------|----------|---------|
| `number` | `string` | `"a1b2c3d4e5f6"` |

**Migration Strategy**:
```typescript
// Old code
const blogId: number = 123;
const url = `/api/cms/blogs/${blogId}`;

// New code
const blogId: string = "a1b2c3d4e5f6";
const url = `/api/cms/blogs/${blogId}`;
```

---

### Image References Migration

Images moved from `ArticleImage` to `MediaAsset`:

| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `ArticleImage.url` | `MediaAsset.url` | Direct mapping |
| `ArticleImage.storage_key` | `MediaAsset.storage_key` | Direct mapping |
| `ArticleImage.alt_text` | `MediaAsset.alt_text` | Direct mapping |
| `ArticleImage.display_order` | `MediaAssetRelation.display_order` | Now in relation table |
| `ArticleImage.file_size` | `MediaAsset.file_size` | Direct mapping |
| N/A | `MediaAsset.width` | NEW - Image width in pixels |
| N/A | `MediaAsset.height` | NEW - Image height in pixels |
| N/A | `MediaAsset.mime_type` | NEW - File MIME type |

---

## API Examples

### Example 1: Create Article with All New Fields

**Endpoint**: `POST /api/cms/blogs/:blogId/articles`

**Request**:
```typescript
const createArticle = async (blogId: string) => {
  const response = await fetch(`/api/cms/blogs/${blogId}/articles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      display_title: "10 Tips for Better SEO in 2024",
      meta_title: "SEO Tips 2024: Boost Your Rankings",
      meta_description: "Discover 10 proven SEO strategies to improve your website's search engine rankings in 2024.",
      focus_keyword: "SEO tips 2024",
      content: "# Introduction\n\nSearch engine optimization continues to evolve...",
      slug: "seo-tips-2024",
      author_id: 5,
      cover_image_id: 123,  // Optional for draft, required for published
      status: "draft"
    })
  });
  
  return response.json();
};
```

**Response**:
```json
{
  "id": 42,
  "display_title": "10 Tips for Better SEO in 2024",
  "meta_title": "SEO Tips 2024: Boost Your Rankings",
  "meta_description": "Discover 10 proven SEO strategies to improve your website's search engine rankings in 2024.",
  "focus_keyword": "SEO tips 2024",
  "content": "# Introduction\n\nSearch engine optimization continues to evolve...",
  "slug": "seo-tips-2024",
  "status": "draft",
  "display_order": 0,
  "published_at": null,
  "cover_image_id": 123,
  "author_id": 5,
  "blog_id": "a1b2c3d4e5f6",
  "created_by": 10,
  "last_edited_by": null,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

### Example 2: Publish Article with Validation

**Endpoint**: `POST /api/cms/blogs/:blogId/articles/:articleId/publish`

**Request**:
```typescript
const publishArticle = async (blogId: string, articleId: number) => {
  const response = await fetch(
    `/api/cms/blogs/${blogId}/articles/${articleId}/publish`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    // Handle validation errors
    if (error.code === '400:Article cannot be published: missing required fields') {
      console.error('Missing fields:', error.details.missingFields);
      // Example: ['cover_image_id', 'meta_description']
    }
  }
  
  return response.json();
};
```

**Success Response**:
```json
{
  "id": 42,
  "status": "published",
  "published_at": "2024-01-15T14:00:00Z",
  "last_edited_by": 10
}
```

**Error Response** (missing required fields):
```json
{
  "status": 400,
  "data": {
    "code": "400:Article cannot be published: missing required fields",
    "message": "Article cannot be published: missing required fields",
    "details": {
      "missingFields": ["cover_image_id", "meta_description"]
    }
  }
}
```

---

### Example 3: Upload Cover Image and Assign to Article

**Step 1: Upload Image to MediaAsset**

**Endpoint**: `POST /api/cms/media/upload`

```typescript
const uploadCoverImage = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('collection_slug', 'article-images');
  formData.append('alt_text', 'SEO tips infographic');
  
  const response = await fetch('/api/cms/media/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    },
    body: formData
  });
  
  return response.json();
};
```

**Response**:
```json
{
  "id": 123,
  "url": "https://cdn.example.com/article-images/seo-tips-infographic.jpg",
  "storage_key": "article-images/2024/01/seo-tips-infographic.jpg",
  "filename": "seo-tips-infographic.jpg",
  "mime_type": "image/jpeg",
  "file_size": 245678,
  "width": 1200,
  "height": 630,
  "alt_text": "SEO tips infographic",
  "status": "ready",
  "collection_id": 5,
  "created_at": "2024-01-15T10:25:00Z"
}
```

**Step 2: Assign Cover Image to Article**

```typescript
const assignCoverImage = async (blogId: string, articleId: number, imageId: number) => {
  const response = await fetch(
    `/api/cms/blogs/${blogId}/articles/${articleId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        cover_image_id: imageId
      })
    }
  );
  
  return response.json();
};
```

---

### Example 4: Create Author with Avatar

**Step 1: Upload Author Avatar**

```typescript
const uploadAuthorAvatar = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('collection_slug', 'author-avatars');
  formData.append('alt_text', 'John Doe profile photo');
  
  const response = await fetch('/api/cms/media/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    },
    body: formData
  });
  
  return response.json();
};
```

**Step 2: Create Author**

**Endpoint**: `POST /api/cms/authors`

```typescript
const createAuthor = async (avatarId: number) => {
  const response = await fetch('/api/cms/authors', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      first_name: "John",
      last_name: "Doe",
      biography: "John is a senior SEO specialist with over 10 years of experience helping businesses improve their online visibility.",
      avatar_id: avatarId
    })
  });
  
  return response.json();
};
```

**Response**:
```json
{
  "id": 5,
  "first_name": "John",
  "last_name": "Doe",
  "biography": "John is a senior SEO specialist with over 10 years of experience helping businesses improve their online visibility.",
  "avatar_id": 456,
  "tenant_id": 1,
  "active": true,
  "created_at": "2024-01-15T09:00:00Z",
  "updated_at": "2024-01-15T09:00:00Z",
  "Avatar": {
    "id": 456,
    "url": "https://cdn.example.com/author-avatars/john-doe.jpg",
    "storage_key": "author-avatars/2024/01/john-doe.jpg",
    "width": 400,
    "height": 400,
    "alt_text": "John Doe profile photo"
  }
}
```

---

### Example 5: Query Articles with Author and Cover Image

**Endpoint**: `GET /api/cms/public/articles?page=1&limit=10`

**Request**:
```typescript
const fetchArticles = async (page: number = 1, limit: number = 10) => {
  const response = await fetch(
    `/api/cms/public/articles?page=${page}&limit=${limit}`,
    {
      headers: {
        'X-Blog-Secret': blogSecretKey
      }
    }
  );
  
  return response.json();
};
```

**Response**:
```json
{
  "data": [
    {
      "id": 42,
      "display_title": "10 Tips for Better SEO in 2024",
      "meta_title": "SEO Tips 2024: Boost Your Rankings",
      "meta_description": "Discover 10 proven SEO strategies to improve your website's search engine rankings in 2024.",
      "focus_keyword": "SEO tips 2024",
      "content": "# Introduction\n\nSearch engine optimization continues to evolve...",
      "slug": "seo-tips-2024",
      "status": "published",
      "display_order": 1,
      "published_at": "2024-01-15T14:00:00Z",
      "blog_id": "a1b2c3d4e5f6",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T14:00:00Z",
      "CoverImage": {
        "id": 123,
        "url": "https://cdn.example.com/article-images/seo-tips-infographic.jpg",
        "storage_key": "article-images/2024/01/seo-tips-infographic.jpg",
        "filename": "seo-tips-infographic.jpg",
        "mime_type": "image/jpeg",
        "width": 1200,
        "height": 630,
        "alt_text": "SEO tips infographic"
      },
      "Author": {
        "id": 5,
        "first_name": "John",
        "last_name": "Doe",
        "biography": "John is a senior SEO specialist with over 10 years of experience...",
        "Avatar": {
          "id": 456,
          "url": "https://cdn.example.com/author-avatars/john-doe.jpg",
          "width": 400,
          "height": 400,
          "alt_text": "John Doe profile photo"
        }
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

**Frontend Usage**:
```tsx
// React component example
const ArticleCard = ({ article }) => {
  return (
    <article>
      {article.CoverImage && (
        <img 
          src={article.CoverImage.url}
          alt={article.CoverImage.alt_text}
          width={article.CoverImage.width}
          height={article.CoverImage.height}
        />
      )}
      
      <h2>{article.display_title}</h2>
      
      <div className="author">
        {article.Author.Avatar && (
          <img 
            src={article.Author.Avatar.url}
            alt={article.Author.Avatar.alt_text}
            className="avatar"
          />
        )}
        <span>By {article.Author.first_name} {article.Author.last_name}</span>
      </div>
      
      <time dateTime={article.published_at}>
        {new Date(article.published_at).toLocaleDateString()}
      </time>
      
      {/* SEO meta tags */}
      <Helmet>
        <title>{article.meta_title}</title>
        <meta name="description" content={article.meta_description} />
        <meta property="og:title" content={article.meta_title} />
        <meta property="og:description" content={article.meta_description} />
        <meta property="og:image" content={article.CoverImage?.url} />
      </Helmet>
    </article>
  );
};
```

---

## TypeScript Type Definitions

### Updated Types

```typescript
// Blog type
export interface Blog {
  id: string;  // UUID (12 characters)
  name: string;
  description: string | null;
  secret_key_hash: string;
  secret_key_salt: string;
  tenant_id: number;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Article type
export interface Article {
  id: number;
  display_title: string;
  meta_title: string;
  meta_description: string | null;
  focus_keyword: string | null;
  content: string;
  slug: string;
  status: ArticleStatus;
  display_order: number;
  published_at: Date | null;
  cover_image_id: number | null;
  author_id: number;
  blog_id: string;  // UUID reference
  created_by: number;
  last_edited_by: number | null;
  created_at: Date;
  updated_at: Date;
  
  // Relations (populated when included)
  CoverImage?: MediaAsset;
  Author?: Author;
  CreatedByAdmin?: Admin;
  LastEditedByAdmin?: Admin;
}

export type ArticleStatus = 'draft' | 'published' | 'archived';

// Author type
export interface Author {
  id: number;
  first_name: string;
  last_name: string;
  biography: string | null;
  avatar_id: number | null;
  tenant_id: number;
  active: boolean;
  created_at: Date;
  updated_at: Date;
  
  // Relations
  Avatar?: MediaAsset;
}

// MediaAsset type
export interface MediaAsset {
  id: number;
  url: string;
  storage_key: string;
  filename: string;
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  metadata: any | null;
  status: string;
  collection_id: number;
  tenant_id: number;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

// MediaAssetRelation type
export interface MediaAssetRelation {
  id: number;
  asset_id: number;
  entity_type: string;
  entity_id: number;
  relation_type: string;
  display_order: number | null;
  metadata: any | null;
  created_at: Date;
  updated_at: Date;
  
  // Relations
  Asset?: MediaAsset;
}

// Admin type (for audit trail)
export interface Admin {
  id: number;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export type AdminRole = 'super_admin' | 'company_admin' | 'company_editor' | 'company_viewer';
```

---

## Validation Rules

### Article Publishing Requirements

Before an article can be published, the following fields **must** be set:

| Field | Requirement | Validation |
|-------|-------------|------------|
| `display_title` | Required | Non-empty string, max 255 characters |
| `meta_title` | Required | Non-empty string, max 60 characters |
| `cover_image_id` | Required | Valid MediaAsset ID |
| `author_id` | Required | Valid Author ID |
| `content` | Required | Non-empty string |
| `meta_description` | Optional | Max 160 characters if provided |
| `focus_keyword` | Optional | Max 100 characters if provided |

**Validation Example**:
```typescript
const validateArticleForPublishing = (article: Partial<Article>): string[] => {
  const errors: string[] = [];
  
  if (!article.display_title || article.display_title.trim() === '') {
    errors.push('display_title is required');
  }
  
  if (!article.meta_title || article.meta_title.trim() === '') {
    errors.push('meta_title is required');
  } else if (article.meta_title.length > 60) {
    errors.push('meta_title cannot exceed 60 characters');
  }
  
  if (article.meta_description && article.meta_description.length > 160) {
    errors.push('meta_description cannot exceed 160 characters');
  }
  
  if (!article.cover_image_id) {
    errors.push('cover_image_id is required');
  }
  
  if (!article.author_id) {
    errors.push('author_id is required');
  }
  
  if (!article.content || article.content.trim() === '') {
    errors.push('content is required');
  }
  
  return errors;
};
```

---

### Slug Validation

Article slugs must be URL-safe:

- Only lowercase letters, numbers, and hyphens
- No consecutive hyphens
- No leading or trailing hyphens
- Unique within the blog

**Validation Example**:
```typescript
const isValidSlug = (slug: string): boolean => {
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugPattern.test(slug);
};

const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')  // Remove special characters
    .replace(/[\s_-]+/g, '-')   // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, '');   // Remove leading/trailing hyphens
};
```

---

### Author-Tenant Validation

Authors must belong to the same tenant as the blog:

```typescript
const validateAuthorTenant = async (
  authorId: number, 
  blogId: string
): Promise<boolean> => {
  const author = await fetchAuthor(authorId);
  const blog = await fetchBlog(blogId);
  
  if (author.tenant_id !== blog.tenant_id) {
    throw new Error('Author must belong to the same tenant as the blog');
  }
  
  return true;
};
```

---

## Migration Checklist

### Frontend Code Updates

- [ ] **Update Blog References**
  - [ ] Change `blog.id` type from `number` to `string`
  - [ ] Remove all references to `blog.slug`
  - [ ] Update URL construction to use `blog.id` (UUID)

- [ ] **Update Article Display**
  - [ ] Replace `article.title` with `article.display_title` in UI
  - [ ] Use `article.meta_title` for SEO meta tags
  - [ ] Add `article.meta_description` to meta tags
  - [ ] Add `article.focus_keyword` handling if needed

- [ ] **Update Image Handling**
  - [ ] Replace `ArticleImage` references with `MediaAsset`
  - [ ] Use `article.CoverImage` for featured images
  - [ ] Update image upload flow to use MediaAsset API
  - [ ] Handle `width` and `height` attributes for responsive images

- [ ] **Add Author Support**
  - [ ] Display author information on articles
  - [ ] Show author avatar using `Author.Avatar`
  - [ ] Create author management UI (if admin dashboard)
  - [ ] Handle author selection in article editor

- [ ] **Update Form Validation**
  - [ ] Add validation for `meta_title` (max 60 chars)
  - [ ] Add validation for `meta_description` (max 160 chars)
  - [ ] Require `cover_image_id` before publishing
  - [ ] Require `author_id` for article creation
  - [ ] Show character count for SEO fields

- [ ] **Update API Calls**
  - [ ] Update article creation payload structure
  - [ ] Handle new error responses for validation
  - [ ] Update query parameters for filtering
  - [ ] Add author and cover image to include queries

- [ ] **Update TypeScript Types**
  - [ ] Import updated type definitions
  - [ ] Update component prop types
  - [ ] Update API response types
  - [ ] Update form state types

---

### Testing Checklist

- [ ] **Unit Tests**
  - [ ] Test slug validation function
  - [ ] Test article validation before publishing
  - [ ] Test SEO metadata length validation
  - [ ] Test author-tenant matching

- [ ] **Integration Tests**
  - [ ] Test article creation with new fields
  - [ ] Test article publishing with validation
  - [ ] Test cover image upload and assignment
  - [ ] Test author creation with avatar
  - [ ] Test article query with relations

- [ ] **E2E Tests**
  - [ ] Test complete article creation flow
  - [ ] Test article publishing workflow
  - [ ] Test image upload and management
  - [ ] Test author management
  - [ ] Test article display on public pages

---

## Common Pitfalls and Solutions

### Pitfall 1: Using Old Title Field

**Problem**: Accessing `article.title` which no longer exists.

**Solution**:
```typescript
// ❌ Wrong
<h1>{article.title}</h1>

// ✅ Correct
<h1>{article.display_title}</h1>
<title>{article.meta_title}</title>
```

---

### Pitfall 2: Publishing Without Required Fields

**Problem**: Attempting to publish an article without cover image or author.

**Solution**:
```typescript
const canPublish = (article: Article): boolean => {
  return !!(
    article.display_title &&
    article.meta_title &&
    article.cover_image_id &&
    article.author_id &&
    article.content
  );
};

// Show publish button only when ready
<button 
  disabled={!canPublish(article)}
  onClick={handlePublish}
>
  {canPublish(article) ? 'Publish' : 'Complete Required Fields'}
</button>
```

---

### Pitfall 3: Exceeding SEO Field Limits

**Problem**: Meta title or description exceeding character limits.

**Solution**:
```typescript
const SEOFieldInput = ({ value, onChange, maxLength, label }) => {
  const remaining = maxLength - (value?.length || 0);
  const isOverLimit = remaining < 0;
  
  return (
    <div>
      <label>{label}</label>
      <input
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        className={isOverLimit ? 'error' : ''}
      />
      <span className={isOverLimit ? 'error' : ''}>
        {remaining} characters remaining
      </span>
    </div>
  );
};

// Usage
<SEOFieldInput
  value={article.meta_title}
  onChange={(e) => setMetaTitle(e.target.value)}
  maxLength={60}
  label="Meta Title"
/>
```

---

### Pitfall 4: Wrong Blog ID Type

**Problem**: Treating blog ID as number instead of UUID string.

**Solution**:
```typescript
// ❌ Wrong
const blogId: number = 123;
const url = `/api/cms/blogs/${blogId}`;

// ✅ Correct
const blogId: string = "a1b2c3d4e5f6";
const url = `/api/cms/blogs/${blogId}`;

// Type guard for safety
const isBlogId = (id: unknown): id is string => {
  return typeof id === 'string' && id.length === 12;
};
```

---

### Pitfall 5: Not Handling MediaAsset Relations

**Problem**: Expecting images in old `ArticleImage` format.

**Solution**:
```typescript
// ❌ Wrong - looking for ArticleImage
const images = article.ArticleImages;

// ✅ Correct - using MediaAsset
const coverImage = article.CoverImage;

// For content images, query MediaAssetRelation
const contentImages = await fetchMediaAssetRelations({
  entity_type: 'article',
  entity_id: article.id,
  relation_type: 'content-image'
});
```

---

## React/Next.js Integration Examples

### Article Editor Component

```tsx
import { useState, useEffect } from 'react';
import { Article, Author, MediaAsset } from '@/types/cms';

interface ArticleEditorProps {
  blogId: string;
  articleId?: number;
}

export const ArticleEditor: React.FC<ArticleEditorProps> = ({ 
  blogId, 
  articleId 
}) => {
  const [article, setArticle] = useState<Partial<Article>>({
    display_title: '',
    meta_title: '',
    meta_description: '',
    focus_keyword: '',
    content: '',
    slug: '',
    status: 'draft',
  });
  
  const [authors, setAuthors] = useState<Author[]>([]);
  const [coverImage, setCoverImage] = useState<MediaAsset | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    // Load authors for selection
    fetchAuthors().then(setAuthors);
    
    // Load existing article if editing
    if (articleId) {
      fetchArticle(blogId, articleId).then(setArticle);
    }
  }, [blogId, articleId]);

  const handleSave = async () => {
    const endpoint = articleId
      ? `/api/cms/blogs/${blogId}/articles/${articleId}`
      : `/api/cms/blogs/${blogId}/articles`;
    
    const method = articleId ? 'PUT' : 'POST';
    
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(article)
    });
    
    if (response.ok) {
      const saved = await response.json();
      setArticle(saved);
    }
  };

  const handlePublish = async () => {
    // Validate before publishing
    const validationErrors = validateArticleForPublishing(article);
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    const response = await fetch(
      `/api/cms/blogs/${blogId}/articles/${article.id}/publish`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      }
    );
    
    if (response.ok) {
      const published = await response.json();
      setArticle(published);
    } else {
      const error = await response.json();
      setErrors([error.data.message]);
    }
  };

  const handleImageUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('collection_slug', 'article-images');
    
    const response = await fetch('/api/cms/media/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      },
      body: formData
    });
    
    if (response.ok) {
      const uploaded = await response.json();
      setCoverImage(uploaded);
      setArticle({ ...article, cover_image_id: uploaded.id });
    }
  };

  return (
    <div className="article-editor">
      <h1>{articleId ? 'Edit Article' : 'Create Article'}</h1>
      
      {errors.length > 0 && (
        <div className="errors">
          {errors.map((error, i) => (
            <p key={i} className="error">{error}</p>
          ))}
        </div>
      )}
      
      <div className="form-group">
        <label>Display Title *</label>
        <input
          type="text"
          value={article.display_title}
          onChange={(e) => setArticle({ 
            ...article, 
            display_title: e.target.value,
            slug: generateSlug(e.target.value)
          })}
          maxLength={255}
        />
      </div>
      
      <div className="form-group">
        <label>Meta Title (SEO) *</label>
        <input
          type="text"
          value={article.meta_title}
          onChange={(e) => setArticle({ 
            ...article, 
            meta_title: e.target.value 
          })}
          maxLength={60}
        />
        <span className="char-count">
          {60 - (article.meta_title?.length || 0)} characters remaining
        </span>
      </div>
      
      <div className="form-group">
        <label>Meta Description (SEO)</label>
        <textarea
          value={article.meta_description || ''}
          onChange={(e) => setArticle({ 
            ...article, 
            meta_description: e.target.value 
          })}
          maxLength={160}
          rows={3}
        />
        <span className="char-count">
          {160 - (article.meta_description?.length || 0)} characters remaining
        </span>
      </div>
      
      <div className="form-group">
        <label>Focus Keyword</label>
        <input
          type="text"
          value={article.focus_keyword || ''}
          onChange={(e) => setArticle({ 
            ...article, 
            focus_keyword: e.target.value 
          })}
          maxLength={100}
        />
      </div>
      
      <div className="form-group">
        <label>Slug *</label>
        <input
          type="text"
          value={article.slug}
          onChange={(e) => setArticle({ 
            ...article, 
            slug: e.target.value 
          })}
          disabled={article.status === 'published'}
        />
        {article.status === 'published' && (
          <span className="help-text">
            Slug cannot be changed for published articles
          </span>
        )}
      </div>
      
      <div className="form-group">
        <label>Author *</label>
        <select
          value={article.author_id || ''}
          onChange={(e) => setArticle({ 
            ...article, 
            author_id: parseInt(e.target.value) 
          })}
        >
          <option value="">Select an author</option>
          {authors.map(author => (
            <option key={author.id} value={author.id}>
              {author.first_name} {author.last_name}
            </option>
          ))}
        </select>
      </div>
      
      <div className="form-group">
        <label>Cover Image *</label>
        {coverImage ? (
          <div className="image-preview">
            <img src={coverImage.url} alt={coverImage.alt_text || ''} />
            <button onClick={() => {
              setCoverImage(null);
              setArticle({ ...article, cover_image_id: null });
            }}>
              Remove
            </button>
          </div>
        ) : (
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file);
            }}
          />
        )}
      </div>
      
      <div className="form-group">
        <label>Content *</label>
        <textarea
          value={article.content}
          onChange={(e) => setArticle({ 
            ...article, 
            content: e.target.value 
          })}
          rows={20}
        />
      </div>
      
      <div className="actions">
        <button onClick={handleSave}>
          Save Draft
        </button>
        
        <button 
          onClick={handlePublish}
          disabled={!canPublish(article)}
        >
          Publish
        </button>
      </div>
    </div>
  );
};
```

---

### Article Display Component

```tsx
import { Article } from '@/types/cms';
import { Helmet } from 'react-helmet';

interface ArticlePageProps {
  article: Article;
}

export const ArticlePage: React.FC<ArticlePageProps> = ({ article }) => {
  return (
    <>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>{article.meta_title}</title>
        <meta name="description" content={article.meta_description || ''} />
        <meta name="keywords" content={article.focus_keyword || ''} />
        
        {/* Open Graph */}
        <meta property="og:title" content={article.meta_title} />
        <meta property="og:description" content={article.meta_description || ''} />
        <meta property="og:type" content="article" />
        <meta property="og:image" content={article.CoverImage?.url} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.meta_title} />
        <meta name="twitter:description" content={article.meta_description || ''} />
        <meta name="twitter:image" content={article.CoverImage?.url} />
      </Helmet>
      
      <article className="article-page">
        {/* Cover Image */}
        {article.CoverImage && (
          <div className="cover-image">
            <img
              src={article.CoverImage.url}
              alt={article.CoverImage.alt_text || article.display_title}
              width={article.CoverImage.width || undefined}
              height={article.CoverImage.height || undefined}
            />
          </div>
        )}
        
        {/* Article Header */}
        <header>
          <h1>{article.display_title}</h1>
          
          {/* Author Info */}
          {article.Author && (
            <div className="author-info">
              {article.Author.Avatar && (
                <img
                  src={article.Author.Avatar.url}
                  alt={article.Author.Avatar.alt_text || 
                       `${article.Author.first_name} ${article.Author.last_name}`}
                  className="author-avatar"
                />
              )}
              <div>
                <p className="author-name">
                  By {article.Author.first_name} {article.Author.last_name}
                </p>
                {article.Author.biography && (
                  <p className="author-bio">{article.Author.biography}</p>
                )}
              </div>
            </div>
          )}
          
          {/* Publication Date */}
          {article.published_at && (
            <time dateTime={article.published_at.toString()}>
              Published on {new Date(article.published_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </time>
          )}
        </header>
        
        {/* Article Content */}
        <div 
          className="article-content"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
        
        {/* Article Footer */}
        <footer>
          {article.focus_keyword && (
            <div className="tags">
              <span className="tag">{article.focus_keyword}</span>
            </div>
          )}
          
          <div className="meta">
            <p>Last updated: {new Date(article.updated_at).toLocaleDateString()}</p>
          </div>
        </footer>
      </article>
    </>
  );
};
```

---

### TanStack Query Hooks

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Article, Author, MediaAsset } from '@/types/cms';

// Fetch articles with pagination
export const useArticles = (blogId: string, page: number = 1, limit: number = 10) => {
  return useQuery({
    queryKey: ['articles', blogId, page, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/cms/public/articles?page=${page}&limit=${limit}`,
        {
          headers: {
            'X-Blog-Secret': getBlogSecret()
          }
        }
      );
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Fetch single article by slug
export const useArticle = (slug: string) => {
  return useQuery({
    queryKey: ['article', slug],
    queryFn: async () => {
      const response = await fetch(
        `/api/cms/public/articles/${slug}`,
        {
          headers: {
            'X-Blog-Secret': getBlogSecret()
          }
        }
      );
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Create article mutation
export const useCreateArticle = (blogId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (article: Partial<Article>) => {
      const response = await fetch(
        `/api/cms/blogs/${blogId}/articles`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
          },
          body: JSON.stringify(article)
        }
      );
      return response.json();
    },
    onSuccess: () => {
      // Invalidate articles list
      queryClient.invalidateQueries({ queryKey: ['articles', blogId] });
    }
  });
};

// Publish article mutation
export const usePublishArticle = (blogId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (articleId: number) => {
      const response = await fetch(
        `/api/cms/blogs/${blogId}/articles/${articleId}/publish`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getToken()}`
          }
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.data.message);
      }
      
      return response.json();
    },
    onSuccess: (_, articleId) => {
      // Invalidate specific article and list
      queryClient.invalidateQueries({ queryKey: ['article', articleId] });
      queryClient.invalidateQueries({ queryKey: ['articles', blogId] });
    }
  });
};

// Upload image mutation
export const useUploadImage = (collectionSlug: string) => {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('collection_slug', collectionSlug);
      
      const response = await fetch('/api/cms/media/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        },
        body: formData
      });
      
      return response.json();
    }
  });
};

// Fetch authors
export const useAuthors = () => {
  return useQuery({
    queryKey: ['authors'],
    queryFn: async () => {
      const response = await fetch('/api/cms/authors', {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      return response.json();
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};
```

---

## Performance Optimization

### Image Optimization

Use Next.js Image component for automatic optimization:

```tsx
import Image from 'next/image';
import { MediaAsset } from '@/types/cms';

interface OptimizedImageProps {
  asset: MediaAsset;
  priority?: boolean;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({ 
  asset, 
  priority = false 
}) => {
  return (
    <Image
      src={asset.url}
      alt={asset.alt_text || ''}
      width={asset.width || 1200}
      height={asset.height || 630}
      priority={priority}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  );
};
```

---

### Caching Strategy

Configure appropriate cache times for different data types:

```typescript
// TanStack Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Published articles - cache longer
      staleTime: 10 * 60 * 1000, // 10 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
      
      // Refetch on window focus for admin pages
      refetchOnWindowFocus: true,
      
      // Retry failed requests
      retry: 2,
    },
  },
});

// Override for specific queries
const { data } = useQuery({
  queryKey: ['article', slug],
  queryFn: fetchArticle,
  staleTime: 5 * 60 * 1000, // 5 minutes for article detail
  cacheTime: 15 * 60 * 1000, // 15 minutes
});
```

---

### Pagination Best Practices

Implement cursor-based pagination for better performance:

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

export const useInfiniteArticles = (blogId: string, limit: number = 10) => {
  return useInfiniteQuery({
    queryKey: ['articles', 'infinite', blogId],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetch(
        `/api/cms/public/articles?page=${pageParam}&limit=${limit}`,
        {
          headers: {
            'X-Blog-Secret': getBlogSecret()
          }
        }
      );
      return response.json();
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
    staleTime: 5 * 60 * 1000,
  });
};

// Usage in component
const InfiniteArticleList = () => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteArticles(blogId);

  return (
    <div>
      {data?.pages.map((page) =>
        page.data.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))
      )}
      
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
};
```

---

## Error Handling

### Comprehensive Error Handler

```typescript
interface APIError {
  status: number;
  data: {
    code: string;
    message?: string;
    details?: any;
  };
}

export const handleAPIError = (error: APIError): string => {
  const errorMap: Record<string, string> = {
    '404:Article not found': 'The article you are looking for does not exist.',
    '400:Article cannot be published: missing required fields': 
      'Please complete all required fields before publishing.',
    '409:Article slug already exists in this blog': 
      'This URL slug is already in use. Please choose a different one.',
    '400:Cannot change slug for published article': 
      'Published articles cannot have their URL changed.',
    '404:Author not found': 'The selected author does not exist.',
    '400:Author must belong to the same tenant as the blog': 
      'You can only assign authors from your organization.',
    '400:Meta title cannot exceed 60 characters': 
      'SEO title must be 60 characters or less.',
    '400:Meta description cannot exceed 160 characters': 
      'SEO description must be 160 characters or less.',
    '400:Cover image is required for published articles': 
      'Please upload a cover image before publishing.',
  };

  return errorMap[error.data.code] || error.data.message || 'An unexpected error occurred.';
};

// Usage in component
const ArticleEditor = () => {
  const [error, setError] = useState<string | null>(null);
  
  const handlePublish = async () => {
    try {
      await publishArticle(articleId);
      setError(null);
    } catch (err) {
      const apiError = err as APIError;
      setError(handleAPIError(apiError));
    }
  };
  
  return (
    <div>
      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}
      {/* ... rest of component */}
    </div>
  );
};
```

---

## Security Considerations

### Content Sanitization

Always sanitize HTML content before rendering:

```typescript
import DOMPurify from 'dompurify';

interface SafeContentProps {
  content: string;
}

export const SafeContent: React.FC<SafeContentProps> = ({ content }) => {
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class']
  });
  
  return (
    <div dangerouslySetInnerHTML={{ __html: sanitized }} />
  );
};
```

---

### API Key Management

Store blog secret keys securely:

```typescript
// ❌ Wrong - hardcoded in code
const BLOG_SECRET = 'abc123xyz';

// ✅ Correct - environment variable
const BLOG_SECRET = process.env.NEXT_PUBLIC_BLOG_SECRET;

// ✅ Better - server-side only
// In Next.js API route or server component
const BLOG_SECRET = process.env.BLOG_SECRET; // No NEXT_PUBLIC prefix
```

---

### Input Validation

Validate all user inputs before submission:

```typescript
import { z } from 'zod';

const articleSchema = z.object({
  display_title: z.string().min(1).max(255),
  meta_title: z.string().min(1).max(60),
  meta_description: z.string().max(160).optional().nullable(),
  focus_keyword: z.string().max(100).optional().nullable(),
  content: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  author_id: z.number().int().positive(),
  cover_image_id: z.number().int().positive().optional().nullable(),
});

const validateArticle = (data: unknown) => {
  try {
    return articleSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { errors: error.errors };
    }
    throw error;
  }
};
```

---

## Troubleshooting

### Issue: Articles Not Loading

**Symptoms**: API returns empty array or 404 errors.

**Possible Causes**:
1. Blog ID format incorrect (using number instead of UUID)
2. Blog secret key missing or incorrect
3. Articles not published (status is 'draft')

**Solutions**:
```typescript
// Check blog ID format
console.log('Blog ID type:', typeof blogId); // Should be 'string'
console.log('Blog ID length:', blogId.length); // Should be 12

// Verify blog secret is set
console.log('Blog secret exists:', !!process.env.NEXT_PUBLIC_BLOG_SECRET);

// Check article status filter
const response = await fetch(
  `/api/cms/public/articles?status=published`, // Explicitly filter
  { headers: { 'X-Blog-Secret': blogSecret } }
);
```

---

### Issue: Publishing Fails with Validation Error

**Symptoms**: Publish endpoint returns 400 with missing fields error.

**Possible Causes**:
1. Cover image not uploaded
2. Author not selected
3. SEO fields empty or too long

**Solutions**:
```typescript
// Pre-validate before attempting to publish
const validateBeforePublish = (article: Partial<Article>) => {
  const errors: string[] = [];
  
  if (!article.display_title?.trim()) {
    errors.push('Display title is required');
  }
  
  if (!article.meta_title?.trim()) {
    errors.push('Meta title is required');
  } else if (article.meta_title.length > 60) {
    errors.push('Meta title must be 60 characters or less');
  }
  
  if (article.meta_description && article.meta_description.length > 160) {
    errors.push('Meta description must be 160 characters or less');
  }
  
  if (!article.cover_image_id) {
    errors.push('Cover image is required');
  }
  
  if (!article.author_id) {
    errors.push('Author is required');
  }
  
  if (!article.content?.trim()) {
    errors.push('Content is required');
  }
  
  return errors;
};

// Show errors to user before attempting publish
const errors = validateBeforePublish(article);
if (errors.length > 0) {
  alert('Cannot publish:\n' + errors.join('\n'));
  return;
}
```

---

### Issue: Images Not Displaying

**Symptoms**: Image URLs return 404 or images don't load.

**Possible Causes**:
1. Using old `ArticleImage` structure
2. MediaAsset not properly linked
3. CORS issues with CDN

**Solutions**:
```typescript
// Check if using correct image structure
console.log('Cover image:', article.CoverImage); // Should be MediaAsset object
console.log('Image URL:', article.CoverImage?.url); // Should be full CDN URL

// Verify MediaAsset relation
if (!article.CoverImage && article.cover_image_id) {
  console.error('Cover image ID exists but relation not loaded');
  // Ensure API includes relations in query
}

// Check CORS headers
fetch(imageUrl, { mode: 'cors' })
  .then(response => console.log('Image accessible:', response.ok))
  .catch(error => console.error('CORS error:', error));
```

---

### Issue: Author Tenant Mismatch

**Symptoms**: Cannot assign author to article, returns 400 error.

**Possible Causes**:
1. Author belongs to different tenant
2. Multi-tenant isolation issue

**Solutions**:
```typescript
// Verify author tenant matches blog tenant
const validateAuthorTenant = async (authorId: number, blogId: string) => {
  const author = await fetchAuthor(authorId);
  const blog = await fetchBlog(blogId);
  
  if (author.tenant_id !== blog.tenant_id) {
    throw new Error(
      `Author (tenant ${author.tenant_id}) does not match blog (tenant ${blog.tenant_id})`
    );
  }
};

// Filter authors by current tenant
const authors = await fetchAuthors({ tenant_id: currentTenantId });
```

---

### Issue: Slug Already Exists

**Symptoms**: Article creation fails with 409 conflict error.

**Possible Causes**:
1. Duplicate slug within the same blog
2. Slug generation not unique

**Solutions**:
```typescript
// Add uniqueness check before submission
const checkSlugUnique = async (slug: string, blogId: string) => {
  const response = await fetch(
    `/api/cms/blogs/${blogId}/articles?slug=${slug}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  
  const articles = await response.json();
  return articles.length === 0;
};

// Generate unique slug with suffix if needed
const generateUniqueSlug = async (title: string, blogId: string) => {
  let slug = generateSlug(title);
  let suffix = 1;
  
  while (!(await checkSlugUnique(slug, blogId))) {
    slug = `${generateSlug(title)}-${suffix}`;
    suffix++;
  }
  
  return slug;
};
```

---

## FAQ

### Q: Can I still use the old `ArticleImage` entity?

**A**: The `ArticleImage` entity is deprecated and will be removed in a future version. All new development should use the `MediaAsset` system. A migration script is provided to convert existing `ArticleImage` records to `MediaAsset`.

---

### Q: What happens to existing blog slugs?

**A**: Blog slugs have been removed. Blogs are now identified by UUID. Update all frontend code to use `blog.id` instead of `blog.slug`.

---

### Q: Do I need to update all articles at once?

**A**: No. The migration preserves existing data. However, when you edit an article, you'll need to:
1. Assign an author
2. Upload a cover image (if publishing)
3. Set SEO metadata fields

---

### Q: Can I change the slug of a published article?

**A**: No. Published articles have immutable slugs to maintain URL stability and SEO. If you need to change the URL, you must:
1. Archive the old article
2. Create a new article with the desired slug
3. Set up a redirect from the old URL to the new one

---

### Q: How do I migrate from ArticleImage to MediaAsset?

**A**: A migration script is provided that:
1. Creates MediaAsset records for each ArticleImage
2. Creates MediaAssetRelation entries linking assets to articles
3. Preserves all metadata (alt text, display order, file size)
4. Maintains the same URLs and storage keys

Run the migration with:
```bash
npx prisma migrate deploy
```

---

### Q: What's the difference between display_title and meta_title?

**A**: 
- **display_title**: The human-readable title shown to readers on the page (max 255 chars)
- **meta_title**: The SEO-optimized title for search engines and social media (max 60 chars)

Best practice: Keep meta_title concise for search results, use display_title for the full descriptive title.

---

### Q: Are cover images required for draft articles?

**A**: No. Cover images are only required when publishing an article. Draft articles can exist without a cover image.

---

### Q: Can multiple articles share the same author?

**A**: Yes. Authors are separate entities that can be assigned to multiple articles. This allows for consistent author information across all their articles.

---

### Q: How do I handle content images (not cover images)?

**A**: Content images should be:
1. Uploaded to the 'article-images' MediaCollection
2. Referenced in markdown using `![alt text](storage_key)` syntax
3. Automatically linked via MediaAssetRelation with `relation_type='content-image'`

---

### Q: What happens if I delete an author with published articles?

**A**: The system prevents deletion of authors who have published articles. You must either:
1. Reassign their articles to another author
2. Archive or delete the articles first
3. Deactivate the author instead (sets `active=false`)

---

### Q: Can I use the same MediaAsset for multiple articles?

**A**: Yes. MediaAssets can be referenced by multiple articles through MediaAssetRelation. This is useful for shared images like logos or common graphics.

---

### Q: How do I optimize images for different screen sizes?

**A**: Use Next.js Image component with the `sizes` prop:
```tsx
<Image
  src={asset.url}
  alt={asset.alt_text}
  width={asset.width}
  height={asset.height}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

---

## Additional Resources

### Documentation
- [Original CMS Integration Guide](./cms-integration-guide.md)
- [Media Storage UI Guide](./cms-media-storage-ui-guide.md)
- [Frontend Blog Authentication Guide](./frontend-blog-authentication-guide.md)

### API Reference
- Swagger Documentation: `/api/docs` (when server is running)
- Postman Collection: Available in `docs/postman/`

### Support
For questions or issues:
1. Check this guide's Troubleshooting section
2. Review the design document: `.kiro/specs/cms-blog-article-refactor/design.md`
3. Check requirements: `.kiro/specs/cms-blog-article-refactor/requirements.md`
4. Contact the backend team for API-specific issues

---

## Changelog

### Version 2.0.0 (Current)
- **BREAKING**: Blog.slug removed, Blog.id changed to UUID
- **BREAKING**: Article.title renamed to meta_title
- **NEW**: Article.display_title field added
- **NEW**: Article SEO fields (meta_description, focus_keyword)
- **NEW**: Article.cover_image_id references MediaAsset
- **NEW**: Author entity with avatar support
- **NEW**: Audit trail (created_by, last_edited_by)
- **DEPRECATED**: ArticleImage entity (use MediaAsset)

### Version 1.0.0 (Legacy)
- Original CMS implementation
- Blog with slug field
- Article with title field
- ArticleImage for image management

---

**Last Updated**: January 2024  
**Spec Version**: cms-blog-article-refactor v1.0  
**API Version**: v2
