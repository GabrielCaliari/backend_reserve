# API Contract: Admin Article Management

**Base Path**: `/api/cms/blogs/:blogId/articles`
**Auth**: AdminJwtGuard + TenantGuard + RolesGuard
**Tenant Resolution**: `x-tenant-id` header (required)

---

## POST /api/cms/blogs/:blogId/articles

**Description**: Create a new article in draft status.
**Minimum Role**: `editor`

**Request Body**:
```json
{
  "title": "string (required, max 255)",
  "content": "string (required)"
}
```

**Response 201**:
```json
{
  "id": 1,
  "title": "Getting Started with NestJS",
  "content": "# Introduction\n...",
  "slug": "getting-started-with-nestjs",
  "status": "draft",
  "display_order": 0,
  "published_at": null,
  "blog_id": 1,
  "created_at": "2026-02-16T14:30:00.000Z",
  "updated_at": "2026-02-16T14:30:00.000Z"
}
```

**Notes**: Slug is auto-generated from title. On collision, `-2`, `-3`, etc. is appended.

**Errors**: 400 (validation), 403 (insufficient role), 404 (blog not found)

---

## GET /api/cms/blogs/:blogId/articles

**Description**: List all articles in a blog (all statuses, admin view).
**Minimum Role**: `viewer`

**Query Parameters**:
- `status` (optional): Filter by status (`draft`, `published`, `archived`).

**Response 200**:
```json
[
  {
    "id": 1,
    "title": "Getting Started with NestJS",
    "slug": "getting-started-with-nestjs",
    "status": "published",
    "display_order": 1,
    "published_at": "2026-02-16T15:00:00.000Z",
    "image_count": 3,
    "created_at": "2026-02-16T14:30:00.000Z",
    "updated_at": "2026-02-16T15:00:00.000Z"
  }
]
```

**Notes**: Content is excluded from list response for performance. Use GET by ID for full content.

---

## PUT /api/cms/blogs/:blogId/articles/:articleId

**Description**: Update article content and metadata.
**Minimum Role**: `editor`

**Request Body**:
```json
{
  "title": "string (optional, max 255)",
  "content": "string (optional)"
}
```

**Response 200**: Updated article object (same shape as GET single).

**Notes**: Updating the title does NOT change the slug. `published_at` is preserved.

**Errors**: 400 (validation), 403 (insufficient role), 404 (article not found)

---

## DELETE /api/cms/blogs/:blogId/articles/:articleId

**Description**: Delete an article and its associated images from storage.
**Minimum Role**: `editor`

**Response 200**:
```json
{
  "message": "Article deleted successfully"
}
```

**Errors**: 403 (insufficient role), 404 (article not found)

---

## POST /api/cms/blogs/:blogId/articles/:articleId/publish

**Description**: Transition article status from `draft` to `published`.
**Minimum Role**: `editor`

**Response 200**:
```json
{
  "id": 1,
  "status": "published",
  "published_at": "2026-02-16T15:00:00.000Z"
}
```

**Errors**: 403 (insufficient role), 404 (article not found), 409 (article is not in draft status)

---

## POST /api/cms/blogs/:blogId/articles/:articleId/archive

**Description**: Transition article status from `published` to `archived`.
**Minimum Role**: `editor`

**Response 200**:
```json
{
  "id": 1,
  "status": "archived"
}
```

**Errors**: 403 (insufficient role), 404 (article not found), 409 (article is not in published status)

---

## PUT /api/cms/blogs/:blogId/articles/reorder

**Description**: Reorder articles within a blog.
**Minimum Role**: `editor`

**Request Body**:
```json
{
  "order": [
    { "id": 3, "display_order": 1 },
    { "id": 1, "display_order": 2 },
    { "id": 5, "display_order": 3 }
  ]
}
```

**Response 200**:
```json
{
  "message": "Articles reordered successfully"
}
```

**Errors**: 400 (invalid article IDs), 403 (insufficient role)
