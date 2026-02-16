# API Contract: Admin Image Management

**Base Path**: `/api/cms/articles/:articleId/images`
**Auth**: AdminJwtGuard + TenantGuard + RolesGuard
**Tenant Resolution**: `x-tenant-id` header (required)

---

## POST /api/cms/articles/:articleId/images

**Description**: Upload an image for an article. The image is automatically compressed and
converted to `.webp` format.
**Minimum Role**: `editor`

**Request**: `multipart/form-data`

| Field | Type | Required | Notes |
|---|---|---|---|
| `file` | File | Yes | Image file (JPEG, PNG, GIF, WebP, AVIF). Max 10 MB. |
| `alt_text` | String | No | Accessibility text for the image. Max 255 chars. |

**Response 201**:
```json
{
  "id": 1,
  "url": "https://bucket.cdn.example.com/cms/tenant-slug/blog-slug/article-slug/1.webp",
  "alt_text": "Architecture diagram",
  "display_order": 1,
  "file_size": 45200,
  "original_format": "jpeg",
  "article_id": 1,
  "created_at": "2026-02-16T15:30:00.000Z"
}
```

**Notes**:
- All images are converted to `.webp` regardless of input format.
- The file is compressed at quality 80 (configurable).
- `file_size` reflects the compressed size, not the original.
- `display_order` is auto-assigned (next available position).

**Errors**:
- 400: Invalid file format or missing file.
- 403: Insufficient role.
- 404: Article not found.
- 413: File exceeds 10 MB limit.
- 422: Article already has 20 images (maximum limit reached).

---

## DELETE /api/cms/articles/:articleId/images/:imageId

**Description**: Delete a specific image from an article. Removes the file from storage
and adjusts remaining images' display order.
**Minimum Role**: `editor`

**Response 200**:
```json
{
  "message": "Image deleted successfully"
}
```

**Errors**: 403 (insufficient role), 404 (image or article not found)

---

## PUT /api/cms/articles/:articleId/images/reorder

**Description**: Reorder images within an article.
**Minimum Role**: `editor`

**Request Body**:
```json
{
  "order": [
    { "id": 5, "display_order": 1 },
    { "id": 2, "display_order": 2 },
    { "id": 8, "display_order": 3 }
  ]
}
```

**Response 200**:
```json
{
  "message": "Images reordered successfully"
}
```

**Errors**: 400 (invalid image IDs), 403 (insufficient role)
