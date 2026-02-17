# Tasks: Lead Collections per Tenant

**Input**: Design documents from `/specs/002-lead-collections/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included per constitution (TDD principle). Tests are written before implementation where applicable.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/modules/zarp-leads/` (bounded context root)
- Prisma schema: `prisma/schema.prisma`
- Domain layer: `src/modules/zarp-leads/domain/`
- Application layer: `src/modules/zarp-leads/application/`
- Infrastructure layer: `src/modules/zarp-leads/infrastructure/`

---

## Phase 1: Setup (Schema & Configuration)

**Purpose**: Database schema changes and Prisma client generation -- foundation for all subsequent work.

- [ ] T001 Add `ECollectionAccessMode` enum (`public`, `private`, `restricted`), `LeadCollection` model with all fields and relations (`@@unique([slug, tenant_id])`, `@@index([tenant_id])`), optional `collection_id` FK on `Lead` model, and `LeadCollection[]` relation on `Tenant` model in `prisma/schema.prisma` -- see `data-model.md` for complete schema
- [ ] T002 Run Prisma migration: `pnpm prisma migrate dev --name add-lead-collections` and verify generated client with `pnpm prisma generate`

---

## Phase 2: Foundational (Domain Layer)

**Purpose**: Pure TypeScript domain artifacts shared by ALL user stories. No NestJS or Prisma dependencies.

**CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 [P] Create `EAccessMode` domain enum (`public`, `private`, `restricted`) with helper type in `src/modules/zarp-leads/domain/enums/access-mode.enum.ts`
- [ ] T004 [P] Create `LeadCollection` domain entity with properties (`id?`, `name`, `slug`, `source`, `accessMode`, `allowedDomains`, `active`, `tenantId`, `createdAt?`, `updatedAt?`) and methods (`isPublic()`, `isPrivate()`, `isRestricted()`, `isActive()`) in `src/modules/zarp-leads/domain/entities/lead-collection.entity.ts` -- see `data-model.md` entity definition
- [ ] T005 [P] Create domain error classes: `CollectionNotFoundError` in `src/modules/zarp-leads/domain/errors/collection-not-found.error.ts`, `CollectionSlugConflictError` in `src/modules/zarp-leads/domain/errors/collection-slug-conflict.error.ts`, `CollectionInactiveError` in `src/modules/zarp-leads/domain/errors/collection-inactive.error.ts`, `InvalidCollectionKeyError` in `src/modules/zarp-leads/domain/errors/invalid-collection-key.error.ts`
- [ ] T006 [P] Create `ILeadCollectionRepository` interface with methods (`create`, `findById`, `findBySlugAndTenantId`, `findBySlug`, `findAllByTenantId`, `findAll`, `findBySecretKey`, `update`, `count`) and `LEAD_COLLECTION_REPOSITORY` symbol token in `src/modules/zarp-leads/domain/interfaces/lead-collection.repository.interface.ts`
- [ ] T007 [P] Create `generateSlug` utility function (adapt pattern from `src/modules/zarp-cms/domain/utils/slug.util.ts`) in `src/modules/zarp-leads/domain/utils/slug.util.ts`
- [ ] T008 Update `Lead` entity to add optional `collectionId?: number` property in `src/modules/zarp-leads/domain/entities/lead.entity.ts`
- [ ] T009 Update domain `interfaces/index.ts` to re-export `ILeadCollectionRepository`, `LEAD_COLLECTION_REPOSITORY` from `src/modules/zarp-leads/domain/interfaces/index.ts`
- [ ] T010 Add collection-related error message constants (`ERROR_CREATE_COLLECTION`, `ERROR_FIND_COLLECTION`, `ERROR_UPDATE_COLLECTION`, `ERROR_COLLECTION_NOT_FOUND`, `ERROR_COLLECTION_SLUG_CONFLICT`, `ERROR_COLLECTION_INACTIVE`, `ERROR_INVALID_COLLECTION_KEY`) in `src/modules/zarp-leads/domain/constants/index.ts`

**Checkpoint**: Domain layer complete -- all pure TypeScript, zero framework dependencies. Ready for user story implementation.

---

## Phase 3: User Story 1 - Tenant-Scoped Collection Management (Priority: P1) MVP

**Goal**: Tenant admins (manager+) can create, list, view, update, and deactivate lead collections scoped to their tenant. Super admins see all collections across tenants.

**Independent Test**: Create a collection via `POST /leads/collections`, list via `GET /leads/collections`, get by ID via `GET /leads/collections/:id`, update via `PUT /leads/collections/:id`, deactivate by setting `active: false`. Verify tenant isolation and role enforcement.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T011 [P] [US1] Create unit tests for `LeadCollectionService` covering: creation with slug generation, listing by tenant, listing all (super admin), get by ID, update metadata, deactivate, slug conflict rejection -- in `src/modules/zarp-leads/application/services/lead-collection.service.spec.ts` using in-memory mock for `ILeadCollectionRepository`

### Implementation for User Story 1

- [ ] T012 [P] [US1] Create `CreateCollectionDto` with validation decorators (`name`: required max 150, `source`: required max 100, `access_mode`: optional enum default `public`, `allowed_domains`: optional string array) and Swagger decorators in `src/modules/zarp-leads/application/dtos/create-collection.dto.ts`
- [ ] T013 [P] [US1] Create `UpdateCollectionDto` with all-optional fields (`name`, `source`, `access_mode`, `allowed_domains`, `active`) and Swagger decorators in `src/modules/zarp-leads/application/dtos/update-collection.dto.ts`
- [ ] T014 [P] [US1] Create `CollectionQueryDto` with pagination (`page`, `limit`) and optional filters (`active`, `access_mode`) in `src/modules/zarp-leads/application/dtos/collection-query.dto.ts`
- [ ] T015 [US1] Create `LeadCollectionRepository` implementing `ILeadCollectionRepository` with Prisma-based CRUD, tenant-scoped queries, `_count` includes for lead counts, and `LeadCollection` entity mapping in `src/modules/zarp-leads/infrastructure/repositories/lead-collection.repository.ts`
- [ ] T016 [US1] Create `LeadCollectionService` with methods: `createCollection` (slug generation, tenant context), `findCollections` (paginated, tenant-scoped or all for super admin), `findCollectionById`, `updateCollection`, `deactivateCollection` -- inject `ILeadCollectionRepository` via `LEAD_COLLECTION_REPOSITORY` symbol in `src/modules/zarp-leads/application/services/lead-collection.service.ts`
- [ ] T017 [US1] Create `LeadCollectionController` with admin CRUD endpoints: `POST /collections` (manager+), `GET /collections` (viewer+), `GET /collections/:id` (viewer+), `PUT /collections/:id` (manager+) -- use `@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)` and `@Roles()` decorators per `contracts/admin-collections.yaml` in `src/modules/zarp-leads/infrastructure/controllers/lead-collection.controller.ts`
- [ ] T018 [US1] Register `LeadCollectionRepository` as `LEAD_COLLECTION_REPOSITORY` provider, add `LeadCollectionService` to providers, add `LeadCollectionController` to controllers, add exports in `src/modules/zarp-leads/zarp-leads.module.ts`

**Checkpoint**: Collection CRUD is fully functional. Admins can manage collections with tenant isolation and RBAC enforcement. US1 acceptance scenarios 1-6 should all pass.

---

## Phase 4: User Story 2 - Public Lead Capture Endpoint (Priority: P2)

**Goal**: External visitors/systems can submit lead data to a collection's dynamic capture endpoint (`POST /leads/collect/:slug`). The endpoint enforces the collection's access mode (public, private/CORS, restricted/auth) and automatically associates captured leads with the collection and its tenant.

**Independent Test**: Submit lead data to a public collection endpoint and verify the lead is stored with correct collection and tenant context. Submit to a private collection from a whitelisted and non-whitelisted origin. Submit to a restricted collection with valid and invalid keys. Submit to an inactive collection and verify rejection.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T019 [P] [US2] Create unit tests for `CollectionSecretKeyGuard` covering: valid key returns true, missing key throws UnauthorizedException, invalid key throws InvalidCollectionKeyError -- in `src/modules/zarp-leads/infrastructure/guards/collection-secret-key.guard.spec.ts`

### Implementation for User Story 2

- [ ] T020 [P] [US2] Create `CollectionSecretKeyGuard` following `BlogSecretKeyGuard` pattern: extract `x-collection-key` header, SHA-256 hash it, look up collection by hash via `ILeadCollectionRepository.findBySecretKey()`, attach collection to request -- in `src/modules/zarp-leads/infrastructure/guards/collection-secret-key.guard.ts`
- [ ] T021 [US2] Update `LeadRepository.create()` to accept and persist optional `collection_id` field, update `Lead` entity mapping to include `collectionId` in `src/modules/zarp-leads/infrastructure/repositories/lead.repository.ts`
- [ ] T022 [US2] Update `LeadService.createLead()` to accept optional `collectionId` parameter for collection-scoped lead creation in `src/modules/zarp-leads/application/services/lead.service.ts`
- [ ] T023 [US2] Create `LeadCaptureController` with `POST /collect/:slug` endpoint: resolve collection by slug, check active status (410 if inactive), enforce access mode (public: passthrough, private: validate Origin header against `allowed_domains` return 403 if invalid, restricted: validate `x-collection-key` via guard), create lead with collection context -- per `contracts/capture.yaml` in `src/modules/zarp-leads/infrastructure/controllers/lead-capture.controller.ts`
- [ ] T024 [US2] Register `CollectionSecretKeyGuard` and `LeadCaptureController` in `src/modules/zarp-leads/zarp-leads.module.ts`

**Checkpoint**: Lead capture via dynamic endpoints is functional. Public, private (CORS), and restricted (auth) modes all enforce correctly. US2 acceptance scenarios 1-5 should all pass.

---

## Phase 5: User Story 3 - Collection Access Mode Configuration (Priority: P3)

**Goal**: Tenant managers can change a collection's access mode at any time. When switching to restricted mode, a secret key is auto-generated and returned. Managers can regenerate keys, immediately invalidating the old one. When switching away from restricted, the key is cleared.

**Independent Test**: Create a public collection, change to private (add domains, verify CORS enforcement), change to restricted (verify key is returned, capture requires key), regenerate key (verify old key fails, new key works), change back to public (verify key is cleared, capture is open).

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T025 [P] [US3] Add unit tests for access mode transition logic in `LeadCollectionService`: public->private (requires allowed_domains), private->restricted (auto-generates key, returns plaintext), restricted->public (clears key), regenerate key (new hash, old key invalid) -- append to `src/modules/zarp-leads/application/services/lead-collection.service.spec.ts`

### Implementation for User Story 3

- [ ] T026 [US3] Add access mode transition logic to `LeadCollectionService.updateCollection()`: when `access_mode` changes to `restricted` auto-generate secret key (`ck_live_` prefix + 32 random bytes hex, SHA-256 hash stored), return plaintext key in response; when changing away from `restricted` clear `secret_key_hash` and `secret_key_salt`; when changing to `private` validate `allowed_domains` is non-empty -- in `src/modules/zarp-leads/application/services/lead-collection.service.ts`
- [ ] T027 [US3] Add `regenerateKey()` method to `LeadCollectionService`: validate collection is in `restricted` mode, generate new key, hash and store, return plaintext -- in `src/modules/zarp-leads/application/services/lead-collection.service.ts`
- [ ] T028 [US3] Add `POST /collections/:id/regenerate-key` endpoint to `LeadCollectionController` (manager+ role) per `contracts/admin-collections.yaml` -- in `src/modules/zarp-leads/infrastructure/controllers/lead-collection.controller.ts`

**Checkpoint**: Access mode configuration is fully functional. Mode transitions handle key generation/clearing correctly. US3 acceptance scenarios 1-4 should all pass.

---

## Phase 6: User Story 4 - Lead Viewing within Collections (Priority: P4)

**Goal**: Tenant admins can list and filter leads within a specific collection to understand per-source lead acquisition performance. Pagination, tenant isolation, and super admin cross-tenant access are enforced.

**Independent Test**: Submit leads to a collection, then list leads via `GET /leads/collections/:id/leads` and verify only leads from that collection are returned with proper pagination. Verify tenant isolation (admin cannot see another tenant's collection leads).

### Implementation for User Story 4

- [ ] T029 [P] [US4] Update `LeadQueryDto` to add optional `collection_id` number filter parameter with Swagger decorators in `src/modules/zarp-leads/application/dtos/lead.dto.ts`
- [ ] T030 [US4] Update `LeadRepository.find()` to support `collection_id` in where clause filter and pass tenant-scoped `where` condition in `src/modules/zarp-leads/infrastructure/repositories/lead.repository.ts`
- [ ] T031 [US4] Update `LeadService.findLeads()` to accept optional `collectionId` filter parameter and pass to repository in `src/modules/zarp-leads/application/services/lead.service.ts`
- [ ] T032 [US4] Add `GET /collections/:id/leads` endpoint to `LeadCollectionController` (viewer+ role): validate collection exists and belongs to tenant, paginated lead listing filtered by `collection_id` per `contracts/admin-collection-leads.yaml` -- in `src/modules/zarp-leads/infrastructure/controllers/lead-collection.controller.ts`

**Checkpoint**: Collection-scoped lead viewing is functional. US4 acceptance scenarios 1-3 should all pass.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements affecting multiple user stories.

- [ ] T033 [P] Add Swagger `@ApiTags('Lead Collections')` and `@ApiOperation` decorators to all new controller methods with complete request/response documentation across `src/modules/zarp-leads/infrastructure/controllers/lead-collection.controller.ts` and `src/modules/zarp-leads/infrastructure/controllers/lead-capture.controller.ts`
- [ ] T034 [P] Update DTO barrel exports in `src/modules/zarp-leads/application/dtos/index.ts` and service barrel exports in `src/modules/zarp-leads/application/services/index.ts`
- [ ] T035 Code cleanup: verify all imports use absolute paths (`@/modules/...`), ensure consistent error response patterns (using `errorResponse`/`successResponse` helpers), remove unused imports
- [ ] T036 Run full validation: `pnpm build` to verify compilation, `pnpm test` to verify all tests pass, manual quickstart.md walkthrough

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies -- can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion (Prisma client must be generated) -- BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 completion -- can start immediately after
- **US2 (Phase 4)**: Depends on Phase 2 completion AND T015/T016 from US1 (needs `LeadCollectionRepository` and `LeadCollectionService` for slug resolution)
- **US3 (Phase 5)**: Depends on US1 (extends `LeadCollectionService` and `LeadCollectionController`)
- **US4 (Phase 6)**: Depends on Phase 2 completion. Can proceed in parallel with US2/US3 if US1 is complete.
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1 (Setup)
    │
Phase 2 (Foundational)
    │
Phase 3 (US1: Collection CRUD) ─── MVP STOP POINT
    │
    ├── Phase 4 (US2: Lead Capture) ──── depends on US1 service+repo
    │
    ├── Phase 5 (US3: Access Modes) ──── depends on US1 service+controller
    │
    └── Phase 6 (US4: Lead Viewing) ──── depends on US1 service+repo
              │
        Phase 7 (Polish) ──── after all stories complete
```

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD, per constitution)
- DTOs before services (services depend on DTO types)
- Repository before service (service depends on repository)
- Service before controller (controller depends on service)
- Module registration after all providers/controllers are created

### Parallel Opportunities

- Phase 2: T003, T004, T005, T006, T007 can all run in parallel (different files, no dependencies)
- US1: T011, T012, T013, T014 can run in parallel (tests + DTOs in separate files)
- US2: T019 and T020 can run in parallel (test + guard in separate files)
- US4: T029 can run in parallel with other work (DTO-only change)

---

## Parallel Example: Phase 2 (Foundational)

```
# Launch all foundational domain tasks together:
Task T003: "Create EAccessMode enum in domain/enums/access-mode.enum.ts"
Task T004: "Create LeadCollection entity in domain/entities/lead-collection.entity.ts"
Task T005: "Create domain error classes in domain/errors/"
Task T006: "Create ILeadCollectionRepository interface in domain/interfaces/"
Task T007: "Create slug utility in domain/utils/slug.util.ts"
```

## Parallel Example: US1 (Collection CRUD)

```
# Launch tests and DTOs together:
Task T011: "Unit tests for LeadCollectionService"
Task T012: "CreateCollectionDto"
Task T013: "UpdateCollectionDto"
Task T014: "CollectionQueryDto"

# Then sequentially:
Task T015: "LeadCollectionRepository" (needs DTOs)
Task T016: "LeadCollectionService" (needs repository)
Task T017: "LeadCollectionController" (needs service)
Task T018: "Module registration" (needs all above)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (schema + migration)
2. Complete Phase 2: Foundational (domain layer)
3. Complete Phase 3: User Story 1 (collection CRUD)
4. **STOP and VALIDATE**: Test US1 independently -- create, list, view, update, deactivate collections
5. Deploy/demo if ready -- collections exist as data containers

### Incremental Delivery

1. Complete Setup + Foundational --> Foundation ready
2. Add US1 (Collection CRUD) --> Test independently --> Deploy (MVP!)
3. Add US2 (Lead Capture) --> Test independently --> Deploy (lead capture works!)
4. Add US3 (Access Mode Config) --> Test independently --> Deploy (security posture is configurable!)
5. Add US4 (Lead Viewing) --> Test independently --> Deploy (full analytics capability!)
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (Collection CRUD) -- MUST complete first (others depend on it)
3. Once US1 is done:
   - Developer A: US2 (Lead Capture)
   - Developer B: US3 (Access Mode Config)
   - Developer C: US4 (Lead Viewing)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable after US1 (MVP)
- TDD: Write tests first, verify they fail, then implement (per constitution principle III)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All file paths use absolute imports (`@/modules/zarp-leads/...`)
- Follow existing patterns: `BlogSecretKeyGuard` for key guard, `slug.util.ts` from CMS for slugs
- Response format: use `successResponse`/`errorResponse` helpers from `@/shared/helpers`
