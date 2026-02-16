# Feature Specification: Multi-Tenant CMS with Blog and RBAC

**Feature Branch**: `001-multi-tenant-cms-rbac`
**Created**: 2026-02-16
**Status**: Draft
**Input**: User description: "Create a baseline based on docs/cms-expansion.md -- Multi-Tenant CMS with Blog and RBAC"

## Assumptions

- The existing `Admin`, `Tenant`, and `AdminTenant` models in the Prisma schema provide the
  multi-tenant foundation. The current `EAdminRole` enum (super_admin, company_admin) will be
  expanded to support the granular role hierarchy (super_admin > owner > manager > editor > viewer).
- The existing `admin-jwt.guard.ts`, `roles.guard.ts`, and `tenant.guard.ts` guards serve as the
  base for RBAC enforcement but will require updates to support the expanded role set and
  tenant-scoped authorization.
- The existing seed data handles initial admin migration (existing admins are promoted/mapped to
  the new role model during seed execution).
- The JWT payload will be extended to include tenant associations and the new role information
  without breaking existing authentication contracts (backward-compatible extension).
- Image uploads accept any common image format (JPEG, PNG, GIF, WebP, AVIF), are compressed and
  optimized server-side, and stored as `.webp`. Maximum file size is 10 MB per image, with a
  maximum of 20 images per article.
- Caching for public endpoints is deferred (no Redis/CDN integration now). TODO markers will be
  placed in code to ensure future implementation.
- The CMS will be a new bounded context: `zarp-cms` under `src/modules/zarp-cms/`.
- Public blog content is accessed via a secret key (`x-blog-secret-key` header), not JWT, enabling
  headless CMS consumption by frontend clients.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - RBAC Role Expansion and Tenant-Scoped Authorization (Priority: P1)

As a platform super-admin, I need a granular role hierarchy so that I can assign different
permission levels to admins across different tenants. A single admin may belong to multiple
tenants with different roles in each.

**Why this priority**: Everything depends on RBAC. Without granular roles and tenant-scoped
authorization, no CMS operation can be properly secured. This is the foundational prerequisite.

**Independent Test**: Can be tested by creating admins with different roles, authenticating,
and verifying that each role can only access the endpoints matching its permission level.

**Acceptance Scenarios**:

1. **Given** the system has a super-admin, **When** the super-admin logs in, **Then** the JWT
   payload contains all tenant associations with their respective roles, and the `isSuperAdmin`
   flag is true.
2. **Given** an admin is assigned the "editor" role for Tenant A and "viewer" role for Tenant B,
   **When** the admin authenticates with Tenant A context, **Then** the admin can create and
   update articles; **When** the admin authenticates with Tenant B context, **Then** the admin
   can only read articles.
3. **Given** an admin with "viewer" role, **When** the admin attempts to create a blog, **Then**
   the system denies the request with an authorization error.
4. **Given** an existing admin in the database, **When** the seed migration runs, **Then** the
   admin retains access and is assigned appropriate roles without manual intervention.

---

### User Story 2 - Blog Management (Priority: P2)

As a tenant manager (or higher), I need to create, update, list, and delete blogs for my
organization so that the organization can maintain one or more blog publications, each with
its own secret key for frontend consumption.

**Why this priority**: Blogs are the top-level container for all CMS content. Articles,
images, and public API access all depend on a blog existing first.

**Independent Test**: Can be tested by creating a blog, listing it, updating its metadata,
and deleting it. Verify that blog operations are tenant-scoped (admins from Tenant A cannot
see Tenant B's blogs).

**Acceptance Scenarios**:

1. **Given** an authenticated manager for a tenant, **When** they create a blog with a name and
   description, **Then** the system generates a unique secret key for the blog and persists it.
2. **Given** a tenant with two blogs, **When** a viewer lists blogs, **Then** only blogs
   belonging to their active tenant are returned.
3. **Given** a blog exists, **When** an editor attempts to delete it, **Then** the system denies
   the request (minimum role: manager).
4. **Given** a blog exists, **When** a manager deletes the blog, **Then** all associated
   articles and images are also removed.

---

### User Story 3 - Article Lifecycle Management (Priority: P3)

As a content editor, I need to create, edit, publish, archive, and delete articles within a
blog so that the organization can produce and manage written content through its full lifecycle
(draft -> published -> archived).

**Why this priority**: Articles are the core content unit of the CMS. They represent the
primary value delivered to end users consuming the public blog API.

**Independent Test**: Can be tested by creating an article in draft status, editing its content,
publishing it, verifying it appears on the public API, archiving it, and verifying it no longer
appears publicly.

**Acceptance Scenarios**:

1. **Given** a blog exists, **When** an editor creates an article with title, content, and
   optional metadata, **Then** the article is saved in "draft" status with an auto-generated
   unique slug.
2. **Given** a draft article, **When** the editor publishes it, **Then** the article status
   changes to "published" and a `published_at` timestamp is recorded.
3. **Given** a published article, **When** the editor archives it, **Then** the article status
   changes to "archived" and it no longer appears in public API responses.
4. **Given** an article with a generated slug, **When** another article is created with the
   same title, **Then** the system generates a unique slug (e.g., by appending a suffix) to
   avoid slug collisions.
5. **Given** an editor updates an article, **When** the update is saved, **Then** the
   `updated_at` timestamp is refreshed but the `published_at` timestamp is preserved.

---

### User Story 4 - Article Image Management (Priority: P4)

As a content editor, I need to upload, reorder, and delete images for articles so that visual
content can accompany written articles and be served optimally to frontend consumers.

**Why this priority**: Images enrich article content but are secondary to the article text
lifecycle itself. They require a storage integration that can be built after core article CRUD.

**Independent Test**: Can be tested by uploading an image to an article, verifying it is
compressed/converted to `.webp`, reordering multiple images, and deleting an image.

**Acceptance Scenarios**:

1. **Given** an article exists, **When** an editor uploads a JPEG image (under 10 MB), **Then**
   the system compresses the image, converts it to `.webp` format without significant quality
   loss, and stores it associated with the article.
2. **Given** an article with 20 images, **When** an editor attempts to upload a 21st image,
   **Then** the system rejects the upload with a clear error message.
3. **Given** an article with 3 images, **When** the editor reorders them (image 3 moves to
   position 1), **Then** the new order is persisted and reflected in subsequent API responses.
4. **Given** an article with images, **When** the editor deletes an image, **Then** the image
   file is removed from storage and the remaining images' order is adjusted.
5. **Given** a user uploads a file larger than 10 MB, **When** the upload is processed, **Then**
   the system rejects it with a clear file-size-exceeded error.

---

### User Story 5 - Public Blog Content API (Priority: P5)

As a frontend application developer, I need a public API to fetch published articles and
article details by slug so that the website can render blog content without requiring admin
authentication.

**Why this priority**: The public API is the delivery mechanism for all CMS content to end
users. It is essential for the frontend but depends on blogs and articles existing first.

**Independent Test**: Can be tested by providing a valid secret key in the `x-blog-secret-key`
header, listing published articles, and fetching a single article by slug. Verify that draft
and archived articles are excluded from responses.

**Acceptance Scenarios**:

1. **Given** a blog with published articles, **When** a frontend client sends a GET request with
   a valid `x-blog-secret-key` header, **Then** only published articles are returned in the
   response, ordered by display position.
2. **Given** a valid secret key and a published article slug, **When** the client requests the
   article by slug, **Then** the full article content including images is returned.
3. **Given** an invalid or missing `x-blog-secret-key` header, **When** a client requests
   articles, **Then** the system returns an authentication error.
4. **Given** a blog with draft and archived articles, **When** the public API is queried, **Then**
   only articles with "published" status are included in the response.

---

### User Story 6 - Article Ordering (Priority: P6)

As a content editor, I need to reorder articles within a blog so that the display order on
the public-facing website reflects editorial decisions rather than chronological creation order.

**Why this priority**: Ordering is an enhancement to the core article management. It adds
editorial control but is not required for the MVP content lifecycle.

**Independent Test**: Can be tested by creating multiple articles, reordering them via the API,
and verifying the new order is reflected in the public API response.

**Acceptance Scenarios**:

1. **Given** a blog with 5 published articles, **When** the editor submits a new order
   (array of article IDs), **Then** the articles' display positions are updated accordingly.
2. **Given** an editor reorders articles, **When** the public API is queried, **Then** articles
   are returned in the updated display order.

---

### User Story 7 - Blog Secret Key Regeneration (Priority: P7)

As a tenant owner, I need to regenerate the secret key for a blog so that if a key is
compromised, access can be rotated without deleting and recreating the blog.

**Why this priority**: Secret key rotation is a security operation that is important but only
needed reactively. It has the lowest usage frequency among all user stories.

**Independent Test**: Can be tested by regenerating a blog's secret key and verifying that
the old key no longer grants access while the new key does.

**Acceptance Scenarios**:

1. **Given** a blog with an active secret key, **When** an owner regenerates the key, **Then**
   a new unique key is generated and the old key is immediately invalidated.
2. **Given** a regenerated key, **When** a frontend client uses the old key, **Then** the
   system returns an authentication error.
3. **Given** an editor attempts to regenerate a key, **When** the request is made, **Then**
   the system denies the request (minimum role: owner).

---

### Edge Cases

- What happens when a blog is deleted that has published articles being actively consumed by a
  frontend? The deletion succeeds, and subsequent public API requests with that blog's key return
  a "not found" or "invalid key" response.
- What happens when an admin is removed from a tenant while they have a valid JWT? The JWT remains
  valid until expiry, but tenant-scoped queries will return empty results since the admin-tenant
  association no longer exists.
- What happens when two editors simultaneously update the same article? The last write wins. No
  optimistic locking is implemented in the MVP (reasonable default for low-concurrency CMS).
- What happens when a slug collision occurs across different blogs in the same tenant? Slugs are
  scoped to a blog, so the same slug may exist in different blogs within the same tenant without
  conflict.
- What happens when the storage provider is unavailable during image upload? The system returns a
  clear error message indicating the upload failed, without corrupting article state.

## Requirements *(mandatory)*

### Functional Requirements

**RBAC & Authentication**:

- **FR-001**: System MUST support an expanded role hierarchy: `super_admin > owner > manager > editor > viewer`.
- **FR-002**: System MUST allow a single admin to belong to multiple tenants with potentially different roles per tenant.
- **FR-003**: System MUST include tenant associations and role information in the JWT payload without breaking existing authentication contracts.
- **FR-004**: System MUST enforce tenant isolation: all CMS queries MUST be scoped to the authenticated admin's active tenant unless the actor is a super-admin.
- **FR-005**: System MUST enforce minimum role requirements on every protected CMS endpoint.

**Blog Management**:

- **FR-006**: System MUST allow managers (or higher) to create blogs with a name and description, automatically generating a unique secret key.
- **FR-007**: System MUST allow viewers (or higher) to list blogs scoped to their active tenant.
- **FR-008**: System MUST allow editors (or higher) to update blog metadata.
- **FR-009**: System MUST allow managers (or higher) to delete a blog, cascading deletion to all associated articles and images.
- **FR-010**: System MUST allow owners (or higher) to regenerate a blog's secret key, immediately invalidating the previous key.

**Article Lifecycle**:

- **FR-011**: System MUST allow editors (or higher) to create articles in "draft" status with an auto-generated unique slug.
- **FR-012**: System MUST support three article statuses: draft, published, archived.
- **FR-013**: System MUST allow editors to publish a draft article, recording a `published_at` timestamp.
- **FR-014**: System MUST allow editors to archive a published article, removing it from public API responses.
- **FR-015**: System MUST prevent slug collisions within the same blog by generating unique slugs when duplicates are detected.
- **FR-016**: System MUST allow editors to delete articles, removing associated images from storage.
- **FR-017**: System MUST allow editors to reorder articles within a blog, updating display position values.

**Image Management**:

- **FR-018**: System MUST accept image uploads in common formats (JPEG, PNG, GIF, WebP, AVIF) up to 10 MB per file.
- **FR-019**: System MUST compress, optimize, and convert uploaded images to `.webp` format without significant quality loss before storage.
- **FR-020**: System MUST enforce a maximum of 20 images per article.
- **FR-021**: System MUST allow editors to reorder images within an article.
- **FR-022**: System MUST allow editors to delete images, removing the file from storage and adjusting remaining image order.

**Public API**:

- **FR-023**: System MUST provide a public endpoint to list published articles for a blog, authenticated via `x-blog-secret-key` header.
- **FR-024**: System MUST provide a public endpoint to retrieve a single published article by slug, authenticated via `x-blog-secret-key` header.
- **FR-025**: System MUST exclude draft and archived articles from all public API responses.

### Key Entities

- **Admin** (existing, extended): Platform user who manages content. Has a role per tenant. Key attributes: name, email, role (per-tenant via AdminTenant), `is_super_admin` flag.
- **Tenant** (existing): Organization/company owning content. Key attributes: name, slug, domain, active status.
- **AdminTenant** (existing, extended): Join entity linking an admin to a tenant with a specific role. Key attributes: admin reference, tenant reference, role, active status.
- **Blog**: Top-level content container belonging to a tenant. Key attributes: name, description, slug, secret key (hashed), tenant reference, active status.
- **Article**: Individual content piece within a blog. Key attributes: title, content (rich text/markdown), slug, status (draft/published/archived), display order, published_at timestamp, blog reference.
- **ArticleImage**: Visual media associated with an article. Key attributes: URL, alt text, display order, file size, original format, article reference.
- **ArticleStatus** (enum): draft, published, archived.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admins can create a blog and publish their first article within 5 minutes of being granted editor access.
- **SC-002**: Frontend clients can retrieve a list of published articles in under 2 seconds using only a secret key (no admin credentials required).
- **SC-003**: Role-based access is enforced with zero unauthorized data access: an admin with "viewer" role cannot create, update, or delete any CMS resource.
- **SC-004**: Tenant isolation is complete: an admin can never access, list, or modify content belonging to a tenant they are not associated with.
- **SC-005**: 100% of uploaded images are automatically converted to optimized `.webp` format, reducing average file size by at least 30% compared to the original upload.
- **SC-006**: Article slug generation handles collisions without user intervention in 100% of cases.
- **SC-007**: Secret key regeneration immediately invalidates the old key: a frontend using the old key receives an authentication error on the very next request.
- **SC-008**: The public API returns only published articles: draft and archived articles have zero visibility to public consumers.
- **SC-009**: All CMS admin endpoints are documented and testable via interactive API documentation.
