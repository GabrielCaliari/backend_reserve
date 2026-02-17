# Feature Specification: Lead Collections per Tenant

**Feature Branch**: `002-lead-collections`  
**Created**: 2026-02-16  
**Status**: Draft  
**Input**: User description: "Leads are organized in collections (LeadCollection) per tenant. Each collection has a source that feeds it. A collection can be marked as public, private (cors) or restricted (auth). If public, its capture endpoint does not require auth or cors. Admins of a tenant only see collections from their own tenant. Super admin sees all collections from all tenants. A tenant can have multiple collections."

## Assumptions

- The existing `Tenant`, `Admin`, and `AdminTenant` models provide the multi-tenant foundation. LeadCollections will be directly associated with a Tenant.
- The existing `Lead` model will be extended with a reference to the new `LeadCollection` entity, establishing which collection each lead belongs to.
- The existing `AdminJwtGuard`, `TenantGuard`, and `RolesGuard` guards provide the base for tenant-scoped access control and will be reused as-is.
- The `EAdminRole` hierarchy (`super_admin > owner > manager > editor > viewer`) is already in place from the multi-tenant CMS feature and will be leveraged for permission checks on collection management.
- Each LeadCollection has a unique slug that is used to build a dynamic public capture endpoint (e.g., `/leads/collect/:collectionSlug`). This slug is unique within a tenant.
- The "source" of a collection is a descriptive label (e.g., "landing-page-home", "facebook-campaign-q1", "google-ads-main") used for organizational and filtering purposes, not an automated integration.
- Access modes for collection capture endpoints:
  - **Public**: No authentication or CORS restrictions. Any origin can submit leads.
  - **Private (CORS)**: No authentication required, but CORS is enforced. Only whitelisted domains can submit leads.
  - **Restricted (Auth)**: Requires a secret key or token in the request header to submit leads.
- Leads submitted through a collection inherit the collection's tenant context automatically.
- Default pagination for collection listings follows the same patterns used elsewhere in the system (page/limit query params).
- A collection can be soft-deactivated (active flag) rather than deleted, to preserve historical lead data integrity.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tenant-Scoped Collection Management (Priority: P1)

As a tenant admin (manager or higher), I need to create, view, update, and deactivate lead collections for my organization so that leads from different sources can be organized and managed separately.

**Why this priority**: Collections are the foundational container for all lead capture. Without collections, leads cannot be organized by source or tenant, and no capture endpoints can exist. This is the prerequisite for all other stories.

**Independent Test**: Can be tested by creating a collection, listing it, updating its metadata, and deactivating it. Verify that collection operations are scoped to the authenticated admin's tenant and that super admins can see collections across all tenants.

**Acceptance Scenarios**:

1. **Given** an authenticated manager for Tenant A, **When** they create a collection with a name, source, and access mode, **Then** the collection is persisted with a unique slug, linked to Tenant A, and defaults to active status.
2. **Given** Tenant A has 3 collections and Tenant B has 2, **When** an admin of Tenant A lists collections, **Then** only the 3 collections from Tenant A are returned.
3. **Given** a super admin, **When** they list collections without tenant filter, **Then** all 5 collections across both tenants are returned with tenant identification.
4. **Given** a super admin, **When** they list collections filtered by a specific tenant, **Then** only that tenant's collections are returned.
5. **Given** a collection exists, **When** a viewer attempts to create or update a collection, **Then** the system denies the request with an authorization error (minimum role: manager).
6. **Given** a collection with existing leads, **When** a manager deactivates the collection, **Then** the collection is marked as inactive, the capture endpoint stops accepting new leads, and existing leads are preserved.

---

### User Story 2 - Public Lead Capture Endpoint (Priority: P2)

As an external visitor or system, I need to submit lead data to a collection's capture endpoint so that leads are captured and stored in the correct collection and tenant context without requiring platform credentials.

**Why this priority**: Lead capture is the primary business value of collections. Without a working capture endpoint, collections are containers without purpose.

**Independent Test**: Can be tested by submitting lead data to a public collection's endpoint and verifying the lead is stored with the correct collection and tenant context. Then test a CORS-restricted collection to verify domain enforcement. Then test an auth-restricted collection to verify secret key validation.

**Acceptance Scenarios**:

1. **Given** a public collection with slug "landing-home" for Tenant A, **When** an unauthenticated request submits lead data to `/leads/collect/landing-home`, **Then** the lead is created and associated with that collection and Tenant A.
2. **Given** a private (CORS) collection with whitelisted domain "example.com", **When** a request from "example.com" submits lead data, **Then** the lead is created successfully. **When** a request from "other.com" submits lead data, **Then** the request is rejected with a CORS error.
3. **Given** a restricted (auth) collection, **When** a request includes a valid secret key in the `x-collection-key` header and submits lead data, **Then** the lead is created. **When** the secret key is missing or invalid, **Then** the request is rejected with an authentication error.
4. **Given** an inactive collection, **When** any request attempts to submit lead data, **Then** the system returns a "collection not available" error.
5. **Given** a public collection, **When** lead data is submitted with missing required fields (e.g., no name and no email), **Then** the system returns a validation error.

---

### User Story 3 - Collection Access Mode Configuration (Priority: P3)

As a tenant manager, I need to configure and update the access mode of a collection (public, private/CORS, restricted/auth) so that I can control how leads are submitted and who can submit them.

**Why this priority**: Access mode configuration determines the security posture of each capture endpoint. While collections can initially be created with a default mode, the ability to change and configure modes is essential for adapting to different campaign requirements.

**Independent Test**: Can be tested by creating a collection with "public" mode, changing it to "private" with allowed domains, verifying CORS enforcement, then changing to "restricted" and verifying secret key enforcement.

**Acceptance Scenarios**:

1. **Given** a public collection, **When** a manager changes it to "private" and specifies allowed domains, **Then** the capture endpoint begins enforcing CORS restrictions against the configured domain list.
2. **Given** a private collection, **When** a manager changes it to "restricted", **Then** a secret key is automatically generated and returned to the manager, and the capture endpoint begins requiring authentication.
3. **Given** a restricted collection, **When** a manager regenerates its secret key, **Then** a new key is generated, the old key is immediately invalidated, and the new key is returned.
4. **Given** a restricted collection, **When** a manager changes it to "public", **Then** the secret key is invalidated and the capture endpoint accepts unauthenticated requests from any origin.

---

### User Story 4 - Lead Viewing within Collections (Priority: P4)

As a tenant admin, I need to view and filter leads within a specific collection so that I can understand lead acquisition performance per source.

**Why this priority**: Viewing leads by collection enables collection-level analytics and operational insights. It depends on collections and lead capture being in place first.

**Independent Test**: Can be tested by submitting leads to a collection, then listing leads filtered by that collection and verifying only leads from that collection are returned with proper pagination.

**Acceptance Scenarios**:

1. **Given** a collection with 50 leads, **When** an admin lists leads for that collection with pagination, **Then** paginated results are returned containing only leads from that collection.
2. **Given** an admin of Tenant A, **When** they attempt to view leads from a collection owned by Tenant B, **Then** the system denies the request.
3. **Given** a super admin, **When** they view leads for any collection across any tenant, **Then** the leads are returned successfully.

---

### Edge Cases

- What happens when a collection slug already exists within the same tenant? The system rejects the creation and returns a clear error indicating the slug is already in use for that tenant.
- What happens when a lead is submitted to a collection endpoint but the collection's tenant is inactive? The system returns a "collection not available" error, treating inactive tenants the same as inactive collections.
- What happens when a CORS-restricted collection has an empty allowed domains list? The system treats it as fully restricted (no external origin is allowed), effectively blocking all cross-origin requests.
- What happens when a super admin creates a collection? The super admin must specify a target tenant since collections are always tenant-scoped. If no tenant is specified, the system returns a validation error.
- What happens when two collections across different tenants have the same slug? This is allowed. Collection slugs are unique within a tenant scope, not globally. The capture endpoint resolves the correct collection by slug since slugs are globally unique in the routing layer (or via an additional tenant identifier in the URL path).
- What happens when the Lead model's existing records have no collection association? Existing leads without a collection reference remain accessible through legacy lead endpoints. The collection reference on the Lead entity is optional to maintain backward compatibility.

## Requirements *(mandatory)*

### Functional Requirements

**Collection Management**:

- **FR-001**: System MUST allow managers (or higher) to create lead collections associated with their tenant, providing a name, source label, and access mode.
- **FR-002**: System MUST auto-generate a unique slug for each collection based on its name, scoped to the tenant. The slug is used for the capture endpoint path.
- **FR-003**: System MUST allow managers to update collection metadata (name, source, access mode, allowed domains, active status).
- **FR-004**: System MUST allow managers to deactivate a collection, which stops the capture endpoint from accepting new leads while preserving existing leads.
- **FR-005**: System MUST allow viewers (or higher) to list collections scoped to their tenant.

**Tenant Isolation & Permissions**:

- **FR-006**: System MUST enforce tenant isolation: tenant admins can only see, create, and manage collections belonging to their own tenant.
- **FR-007**: System MUST allow super admins to view all collections across all tenants, with optional tenant filtering.
- **FR-008**: System MUST enforce minimum role requirements: viewer for reading, manager for creating/updating/deactivating collections.

**Capture Endpoints**:

- **FR-009**: System MUST provide a dynamic capture endpoint per collection (e.g., `/leads/collect/:collectionSlug`) that accepts lead submissions.
- **FR-010**: System MUST enforce the collection's access mode on its capture endpoint:
  - Public: No authentication or CORS restrictions.
  - Private (CORS): CORS enforcement with a configurable list of allowed domains.
  - Restricted (Auth): Secret key validation via `x-collection-key` header.
- **FR-011**: System MUST reject lead submissions to inactive collections with a clear error message.
- **FR-012**: System MUST automatically associate submitted leads with the collection and its tenant.

**Access Mode Configuration**:

- **FR-013**: System MUST support three access modes: `public`, `private`, `restricted`.
- **FR-014**: System MUST allow managers to change the access mode of a collection at any time.
- **FR-015**: System MUST auto-generate and securely store a secret key when a collection is set to "restricted" mode.
- **FR-016**: System MUST allow managers to regenerate the secret key of a restricted collection, immediately invalidating the previous key.
- **FR-017**: System MUST store allowed CORS domains for private collections as a configurable list.

**Lead-Collection Association**:

- **FR-018**: System MUST associate each captured lead with exactly one collection.
- **FR-019**: System MUST allow leads to be listed and filtered by collection.
- **FR-020**: System MUST maintain backward compatibility with existing leads that have no collection association (optional collection reference).

### Key Entities

- **LeadCollection**: A container for organizing leads within a tenant. Key attributes: name, slug (unique per tenant), source label, access mode (public/private/restricted), allowed CORS domains (for private mode), secret key hash and salt (for restricted mode), active status, tenant reference.
- **Lead** (existing, extended): Individual lead entry. Extended with an optional collection reference to indicate which collection the lead was captured through.
- **Tenant** (existing): Organization owning collections. Extended with a relation to LeadCollection (one-to-many).
- **AccessMode** (enum): public, private, restricted. Determines the security posture of a collection's capture endpoint.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tenant admins can create a collection and capture their first lead through its endpoint within 3 minutes.
- **SC-002**: Tenant isolation is complete: an admin can never list, view, or manage collections belonging to a tenant they are not associated with.
- **SC-003**: Public collection endpoints accept lead submissions from any origin without authentication, with a response time under 500 milliseconds.
- **SC-004**: CORS-restricted collections correctly block requests from non-whitelisted domains and accept requests from whitelisted domains in 100% of cases.
- **SC-005**: Auth-restricted collections reject 100% of requests with missing or invalid secret keys.
- **SC-006**: Super admins can view all collections across all tenants in a single query with optional tenant filtering.
- **SC-007**: Deactivating a collection immediately stops lead capture: the next submission attempt returns an error.
- **SC-008**: Existing leads without a collection association remain fully accessible through existing lead endpoints with zero data loss or migration issues.
- **SC-009**: Secret key regeneration immediately invalidates the old key: a submission using the old key is rejected on the very next request.
