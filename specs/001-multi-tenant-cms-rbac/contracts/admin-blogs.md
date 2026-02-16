# API Contract: Admin Blog Management

**Base Path**: `/api/cms/blogs`
**Auth**: AdminJwtGuard + TenantGuard + RolesGuard
**Tenant Resolution**: `x-tenant-id` header (required)

---

## POST /api/cms/blogs

**Description**: Create a new blog for the authenticated admin's active tenant.
**Minimum Role**: `manager`

**Request Body**:
```json
{
  "name": "string (required, max 150)",
  "description": "string (optional)"
}
```

**Response 201**:
```json
{
  "id": 1,
  "name": "Engineering Blog",
  "description": "Technical articles",
  "slug": "engineering-blog",
  "secret_key": "aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1v",
  "tenant_id": 1,
  "active": true,
  "created_at": "2026-02-16T14:00:00.000Z"
}
```

**Notes**: `secret_key` is returned in plaintext ONLY at creation time. The slug
is auto-generated from the blog name.

**Errors**: 400 (validation), 403 (insufficient role), 409 (slug conflict within tenant)

---

## GET /api/cms/blogs

**Description**: List all blogs belonging to the authenticated admin's active tenant.
**Minimum Role**: `viewer`

**Response 200**:
```json
[
  {
    "id": 1,
    "name": "Engineering Blog",
    "description": "Technical articles",
    "slug": "engineering-blog",
    "active": true,
    "article_count": 12,
    "created_at": "2026-02-16T14:00:00.000Z"
  }
]
```

**Notes**: `secret_key` is NEVER returned in list responses.

---

## PUT /api/cms/blogs/:blogId

**Description**: Update blog metadata.
**Minimum Role**: `editor`

**Request Body**:
```json
{
  "name": "string (optional, max 150)",
  "description": "string (optional)"
}
```

**Response 200**: Updated blog object (same shape as GET, without secret_key).

**Errors**: 400 (validation), 403 (insufficient role), 404 (blog not found)

---

## DELETE /api/cms/blogs/:blogId

**Description**: Delete a blog and cascade-delete all associated articles and images.
**Minimum Role**: `manager`

**Response 200**:
```json
{
  "message": "Blog deleted successfully"
}
```

**Errors**: 403 (insufficient role), 404 (blog not found)

---

## POST /api/cms/blogs/:blogId/regenerate-key

**Description**: Regenerate the secret key for a blog, immediately invalidating the old key.
**Minimum Role**: `owner`

**Response 200**:
```json
{
  "secret_key": "xY2zA4bC6dE8fG0hI2jK4lM6nO8pQ0r"
}
```

**Notes**: The new `secret_key` is returned in plaintext ONLY during this operation.

**Errors**: 403 (insufficient role), 404 (blog not found)
