# API Contract: Public Blog API

**Base Path**: `/api/cms/public`
**Auth**: `x-blog-secret-key` header (BlogSecretKeyGuard)
**No JWT required** -- designed for frontend consumption.

---

## GET /api/cms/public/articles

**Description**: List published articles for a blog. Only articles with `published` status
are returned. Results are ordered by `display_order` ascending.
**Auth**: `x-blog-secret-key` header (required)

**Query Parameters**:
- `page` (optional, default: 1): Page number for pagination.
- `limit` (optional, default: 10, max: 50): Articles per page.

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "title": "Getting Started with NestJS",
      "slug": "getting-started-with-nestjs",
      "content": "# Introduction\n...",
      "published_at": "2026-02-16T15:00:00.000Z",
      "display_order": 1,
      "images": [
        {
          "id": 1,
          "url": "https://bucket.cdn.example.com/cms/tenant/blog/article/1.webp",
          "alt_text": "Architecture diagram",
          "display_order": 1
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "total_pages": 3
  }
}
```

**Notes**:
- Only `published` articles are returned. Draft and archived articles are excluded.
- Images are embedded in the article response, ordered by `display_order`.
- Responses include full `content` (no truncation in this endpoint).

**Errors**:
- 401: Missing or invalid `x-blog-secret-key` header.
- 404: Blog not found (key valid but blog inactive/deleted).

**Cache Headers** (future):
```
// TODO(CACHE): Add Cache-Control: public, max-age=300
// TODO(CACHE): Add ETag based on latest article updated_at
```

---

## GET /api/cms/public/articles/:slug

**Description**: Retrieve a single published article by its slug. Only articles with
`published` status are accessible.
**Auth**: `x-blog-secret-key` header (required)

**Response 200**:
```json
{
  "id": 1,
  "title": "Getting Started with NestJS",
  "slug": "getting-started-with-nestjs",
  "content": "# Introduction\n\nFull article content here...",
  "status": "published",
  "published_at": "2026-02-16T15:00:00.000Z",
  "images": [
    {
      "id": 1,
      "url": "https://bucket.cdn.example.com/cms/tenant/blog/article/1.webp",
      "alt_text": "Architecture diagram",
      "display_order": 1
    },
    {
      "id": 2,
      "url": "https://bucket.cdn.example.com/cms/tenant/blog/article/2.webp",
      "alt_text": "Sequence diagram",
      "display_order": 2
    }
  ],
  "created_at": "2026-02-16T14:30:00.000Z",
  "updated_at": "2026-02-16T15:00:00.000Z"
}
```

**Errors**:
- 401: Missing or invalid `x-blog-secret-key` header.
- 404: Article not found or not in `published` status.

**Cache Headers** (future):
```
// TODO(CACHE): Add Cache-Control: public, max-age=600
// TODO(CACHE): Add ETag based on article updated_at
```
