# Research: Multi-Tenant CMS with Blog and RBAC

**Phase 0 Output** | **Date**: 2026-02-16 | **Status**: Complete

## 1. RBAC Role Expansion Strategy

### Decision
Expand `EAdminRole` from 2 roles (`super_admin`, `company_admin`) to 5 roles
(`super_admin`, `owner`, `manager`, `editor`, `viewer`). Move role assignment from the
`Admin` model level to the `AdminTenant` join table so that a single admin can have
different roles in different tenants.

### Rationale
The current model stores role on `Admin.role` as a global attribute. This is insufficient
for multi-tenant scenarios where the same person might be an `owner` of their own company
but only a `viewer` in a partner's tenant. The `AdminTenant` join table already exists
with `admin_id` and `tenant_id` -- adding a `role` column here is the natural place for
per-tenant authorization.

### Alternatives Considered
1. **Keep role on Admin model, add separate permission table**: Rejected -- adds unnecessary
   complexity. The role-per-tenant model is sufficient for the defined use cases.
2. **Create a separate `AdminRole` entity with admin_id, tenant_id, role**: Rejected --
   duplicates the existing `AdminTenant` relationship. Adding a column is simpler.

### Migration Impact
- Existing `AdminTenant` rows: default `role` to `company_admin` (backward-compatible).
- Existing `Admin.role` field: keep for backward compatibility but document as deprecated
  for new CMS features. The `RolesGuard` will prefer `AdminTenant.role` when tenant context
  is available, falling back to `Admin.role` for global endpoints.
- Seed script: must map existing admins to appropriate roles.

---

## 2. RolesGuard Update for Per-Tenant Roles

### Decision
Update `RolesGuard` to resolve the admin's role from `AdminTenant.role` when a `tenant_id`
is present in the request (set by `TenantGuard`). Fall back to `Admin.role` when no tenant
context exists (backward compatibility for non-tenant-scoped endpoints).

### Rationale
The guard must support both global endpoints (e.g., `/api/tenants` -- only super_admin)
and tenant-scoped endpoints (e.g., `/api/cms/blogs` -- role varies per tenant). Using
the request's `tenant_id` to look up the specific role in `AdminTenant` ensures the CMS
respects per-tenant permissions.

### Alternatives Considered
1. **Create a new CmsRolesGuard**: Rejected -- violates DRY. A single guard with
   conditional logic is cleaner and maintains a single source of truth for role checking.
2. **Include role in JWT payload**: Partially adopted -- the JWT will include tenant
   associations, but the guard must still validate against the database for freshness
   (role changes between JWT refreshes).

### Implementation Notes
- Add `findRoleInTenant(adminId, tenantId)` to `IAdminTenantRepository`.
- Guard checks: if `request.tenant_id` exists, query `AdminTenant.role`; otherwise
  use `Admin.role`.
- Super admin bypasses all role checks regardless of context.

---

## 3. Image Processing Pipeline

### Decision
Use the `sharp` library (new dependency) for server-side image compression and format
conversion. Accept uploads in JPEG, PNG, GIF, WebP, AVIF (up to 10 MB). Convert all
images to `.webp` format with quality 80 (configurable). Abstract behind
`IImageProcessor` interface.

### Rationale
`sharp` is the de facto standard for Node.js image processing: high performance
(libvips-based), supports all required input formats, and produces excellent `.webp`
output with minimal quality loss at quality 80. It handles the compression pipeline in
a single pass: `sharp(buffer).webp({ quality: 80 }).toBuffer()`.

### Alternatives Considered
1. **Jimp**: Rejected -- significantly slower than `sharp`, lacks WebP output support.
2. **Client-side conversion**: Rejected -- unreliable across browsers, and the spec
   requires server-side processing to guarantee consistent output.
3. **Cloud-based conversion (e.g., Cloudinary)**: Rejected -- adds external dependency
   and cost. `sharp` is free and runs locally.

### Implementation Notes
- Install: `pnpm add sharp`
- Interface: `IImageProcessor.processToWebp(buffer: Buffer): Promise<{ data: Buffer; size: number }>`
- Provider: `SharpImageProcessorProvider` in `infrastructure/providers/`
- Max dimensions: preserve original aspect ratio, no resize unless explicitly requested.

---

## 4. Object Storage Pattern

### Decision
Reuse the existing `@aws-sdk/client-s3` pattern from `reserve-journals` (DigitalOcean Spaces /
S3-compatible storage). Abstract behind `IStorageProvider` interface in the CMS domain layer.

### Rationale
The project already uses `@aws-sdk/client-s3` in `journal.service.ts` for S3 uploads. The
pattern works with DigitalOcean Spaces and any S3-compatible provider. Abstracting behind
an interface enables swapping the storage backend (e.g., Vercel Blob in the future)
without changing domain or application code.

### Alternatives Considered
1. **Vercel Blob Storage**: Documented in `cms-expansion.md` as an option -- deferred.
   The S3 pattern is already established in the codebase and is provider-agnostic.
2. **Local filesystem storage**: Rejected -- not suitable for production, doesn't
   support multi-server deployments.

### Implementation Notes
- Interface: `IStorageProvider` with `upload(key, data, contentType)`, `delete(key)`, `getUrl(key)`
- Provider: `S3StorageProvider` using existing env vars pattern
  (`CMS_BUCKET_ENDPOINT`, `CMS_BUCKET_ACCESS_KEY_ID`, etc.)
- Bucket key pattern: `cms/{tenantSlug}/{blogSlug}/{articleSlug}/{imageId}.webp`

---

## 5. Blog Secret Key Authentication

### Decision
Generate random secret keys (32 bytes, base64url-encoded), store them as SHA-256 hash + salt
in the `Blog` table. Create a `BlogSecretKeyGuard` that validates the `x-blog-secret-key`
header against the stored hash.

### Rationale
Secret keys enable headless CMS consumption by frontend clients without requiring admin JWT
authentication. The hash+salt storage pattern is consistent with how the project stores
session tokens (`AdminSessionToken.hash_token` + `salt`). Using SHA-256 is fast enough for
API key validation (not password hashing, which needs slow algorithms like PBKDF2).

### Alternatives Considered
1. **Store secret key in plaintext**: Rejected -- security risk if the database is compromised.
2. **Use JWT for public API**: Rejected -- requires admin authentication flow, which is
   inappropriate for frontend-to-API consumption.
3. **API key in query parameter**: Rejected -- leaks in server logs and browser history.
   Header-based auth is standard practice.

### Implementation Notes
- Key generation: `crypto.randomBytes(32).toString('base64url')`
- Hash: `crypto.createHash('sha256').update(key + salt).digest('hex')`
- Guard: `BlogSecretKeyGuard` reads `x-blog-secret-key` header, hashes it with the blog's
  salt, compares with `secret_key_hash`.
- The plaintext key is returned ONLY at creation time and during key regeneration.

---

## 6. Article Slug Generation

### Decision
Use a simple slug generation function: lowercase, replace spaces with hyphens, remove
special characters. On collision within the same blog, append `-2`, `-3`, etc. incrementally.

### Rationale
Slugs are scoped to a blog (unique constraint: `[slug, blog_id]`), so cross-blog collisions
are irrelevant. The incremental suffix approach is simple, predictable, and handles the
99% case. No external dependency needed.

### Alternatives Considered
1. **UUID-based slugs**: Rejected -- not human-readable, terrible for SEO.
2. **Timestamp-based suffixes**: Rejected -- less predictable and harder to communicate.
3. **External library (slugify)**: Considered but not needed -- the logic is trivial
   enough for an inline utility function.

### Implementation Notes
- Utility: `generateSlug(title: string): string` in `src/modules/reserve-cms/domain/`
- Collision detection: `articleRepository.existsBySlugAndBlogId(slug, blogId)`
- Loop: try base slug, then `${slug}-2`, `${slug}-3`, etc. up to 10 attempts before error.

---

## 7. Caching Strategy (Deferred)

### Decision
No caching implementation in this feature. Add `TODO(CACHE)` markers at public API endpoints
and service methods to ensure future discoverability.

### Rationale
The spec explicitly defers caching. Public API response times are acceptable without cache
for the initial scale (~10 tenants, ~50 articles each). Redis/CDN integration will be
addressed in a follow-up feature when scalability requires it.

### TODO Markers (to be placed in code)
- `// TODO(CACHE): Add Redis cache layer for published article listing`
- `// TODO(CACHE): Add CDN cache headers (Cache-Control, ETag) for public API responses`
- `// TODO(CACHE): Invalidate cache when article is published/archived/deleted`
