# Research: Lead Collections per Tenant

**Branch**: `002-lead-collections` | **Date**: 2026-02-16

## Decision Log

### R-001: Extend `zarp-leads` vs New Bounded Context

**Decision**: Extend the existing `zarp-leads` bounded context.

**Rationale**: LeadCollections are a natural sub-domain of lead management. They organize leads, define capture endpoints, and are always queried alongside leads. Creating a separate `zarp-lead-collections` module would introduce unnecessary cross-context imports (leads must reference collections and vice-versa), violating the constitution's rule against importing another context's internal classes.

**Alternatives considered**:
- New bounded context `zarp-lead-collections`: Rejected because collections and leads are tightly coupled (a lead belongs to a collection, a collection contains leads). This would require constant cross-context communication and defeat the purpose of bounded contexts.

---

### R-002: Collection Secret Key Storage Pattern

**Decision**: Follow the same pattern as `BlogSecretKeyGuard` -- SHA-256 hash of the secret key stored in the database. The plaintext key is returned to the admin only on creation/regeneration and never persisted.

**Rationale**: The project already has a proven, tested pattern for secret key management in the CMS module (`blog-secret-key.guard.ts`). Reusing this approach ensures consistency, reduces learning curve, and avoids introducing new dependencies. The SHA-256 hash approach is sufficient for API key validation (not password-grade, but appropriate for API keys used in headers).

**Alternatives considered**:
- PBKDF2/bcrypt hashing: Rejected for API keys. These are appropriate for passwords but introduce unnecessary latency for per-request key validation. SHA-256 is standard practice for API key storage.
- JWT-based collection tokens: Rejected. Adds complexity and the secret key pattern already works well for the CMS context. JWTs require expiration management and token refresh, which is unnecessary for static collection access.

---

### R-003: Access Mode Enforcement Strategy

**Decision**: Use a combination of a custom `CollectionSecretKeyGuard` (for restricted mode), dynamic CORS middleware/interceptor (for private mode), and no guards (for public mode). The capture controller resolves the collection by slug, checks its active status and access mode, and applies the appropriate enforcement.

**Rationale**: Each access mode has different security requirements:
- **Public**: No guard needed. The controller simply validates the request body and creates the lead.
- **Private (CORS)**: CORS validation is enforced at the controller/interceptor level by checking the `Origin` header against the collection's allowed domains list. Standard NestJS CORS middleware is configured per-application, not per-route, so a custom interceptor is the cleanest approach.
- **Restricted (Auth)**: A guard validates the `x-collection-key` header against the stored hash, identical to the blog secret key pattern.

The capture controller itself handles mode resolution:
1. Load collection by slug
2. Check active status
3. Switch on access mode → public (passthrough), private (validate origin), restricted (validate key)

**Alternatives considered**:
- Single guard handling all three modes: Rejected. Mixing three different security strategies in a single guard violates SRP and makes testing harder.
- Separate routes per access mode: Rejected. The dynamic nature of collections (a manager can change the mode at any time) means the route must be a single entry point that adapts behavior based on the collection's current configuration.

---

### R-004: Collection Slug Generation

**Decision**: Auto-generate slugs from the collection name using the same `slug.util.ts` utility already present in `zarp-cms`. Slugs are unique within a tenant (enforced by a composite unique constraint on `[slug, tenant_id]`).

**Rationale**: The CMS context already has a slug generation utility with collision detection. Reusing this pattern (or a shared copy) ensures consistent slug behavior across the platform.

**Alternatives considered**:
- Global slug uniqueness: Rejected. The spec explicitly states slugs are unique within a tenant. Global uniqueness would unnecessarily restrict slug usage across tenants.
- UUID-based slugs: Rejected. Human-readable slugs are better for constructing capture URLs (e.g., `/leads/collect/landing-home` vs `/leads/collect/a1b2c3d4-e5f6`).

---

### R-005: CORS Enforcement for Private Collections

**Decision**: Use a NestJS interceptor (`CollectionCorsInterceptor`) that runs after the collection is loaded from the database. The interceptor checks the request `Origin` header against the collection's `allowed_domains` list and sets appropriate CORS response headers or rejects the request.

**Rationale**: NestJS's built-in CORS configuration (`app.enableCors()`) is global and cannot be configured dynamically per-route or per-collection. A per-request interceptor is the standard NestJS pattern for dynamic CORS enforcement. The interceptor approach:
1. Loads the collection (already resolved by the controller or a param decorator)
2. If mode is `private`, checks `Origin` against `allowed_domains`
3. Sets `Access-Control-Allow-Origin` and related headers for valid origins
4. Rejects with 403 for invalid origins

**Alternatives considered**:
- Custom middleware: Rejected. NestJS middleware runs before guards and route handlers, meaning the collection hasn't been resolved yet. The interceptor runs after route matching, making it the better fit.
- Pre-flight-only CORS: Insufficient. The actual POST request also needs origin validation, not just OPTIONS preflight.

---

### R-006: Backward Compatibility with Existing Leads

**Decision**: The `collection_id` field on the `Lead` model is optional (`Int?` in Prisma). No migration of existing leads to collections is required.

**Rationale**: The spec explicitly states backward compatibility is required. Existing leads (captured before the collections feature) have no collection context and should remain accessible through existing lead endpoints. Making the FK optional avoids:
- Data migration risk
- Downtime
- Breaking existing lead queries

**Alternatives considered**:
- Mandatory FK with a default "legacy" collection: Rejected. This would require creating phantom collections for tenants that may not use the collections feature, and assigns meaning where none exists.
- Separate lead table for collection-based leads: Rejected. Introduces data duplication and makes cross-queries (all leads for a tenant) unnecessarily complex.

---

### R-007: DDD Complexity Tier

**Decision**: DDD-lite (moderate logic with orchestration).

**Rationale**: According to the constitution's Proportional Architecture principle:
- LeadCollections have some business rules (access mode enforcement, secret key management, slug uniqueness, active/inactive state).
- They involve orchestration (resolving collections by slug, validating access modes, creating leads with collection context).
- But they do NOT have complex domain rules, invariants, or multiple state transitions that would warrant full DDD (aggregates, domain events, use cases).

The DDD-lite approach uses: entities, services with interface-based repos, and simple domain errors.

---

### R-008: Capture Route Path Strategy

**Decision**: Use `/leads/collect/:slug` as the capture endpoint path, where `:slug` is the collection's unique slug within the system.

**Rationale**: The `/leads` prefix is already registered in `app.module.ts` for the `ZarpLeadsModule`. Adding `collect/:slug` under it is natural and avoids route collision with existing lead CRUD routes (`/`, `/:id`, `/:id/status`). The `collect` path segment clearly differentiates capture endpoints from admin lead management endpoints.

**Alternatives considered**:
- `/leads/:slug` (no `collect` segment): Rejected. Collides with `/:id` route (`:slug` and `:id` are both dynamic params at the same path segment).
- `/collect/:slug` (top-level): Rejected. Would require a new route prefix in `app.module.ts` or a new module. The capture endpoint is part of the leads domain.
- `/leads/collections/:slug/capture`: Rejected. Too verbose for external use in forms and landing pages.
