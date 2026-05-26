# Tasks: Multi-Tenant CMS with Blog and RBAC

**Input**: Design documents from `/specs/001-multi-tenant-cms-rbac/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are included per the constitution's TDD mandate (Principle III -- NON-NEGOTIABLE).
Tests MUST be written FIRST and FAIL before implementation (Red-Green-Refactor cycle).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project scaffold and new dependency installation

- [x] T001 Create `reserve-cms` module directory structure per plan.md: `src/modules/reserve-cms/{domain/{entities,enums,errors,interfaces},application/{dtos,services},infrastructure/{controllers,repositories,guards,providers}}`
- [x] T002 Install `sharp` dependency via `pnpm add sharp` and `pnpm add -D @types/sharp`
- [x] T003 [P] Add CMS environment variables to `.env.example`: `CMS_BUCKET_ENDPOINT`, `CMS_BUCKET_ACCESS_KEY_ID`, `CMS_BUCKET_SECRET_ACCESS_KEY`, `CMS_BUCKET_REGION`, `CMS_BUCKET_NAME`, `CMS_IMAGE_QUALITY`, `CMS_IMAGE_MAX_SIZE_BYTES`, `CMS_MAX_IMAGES_PER_ARTICLE`
- [x] T004 [P] Create `EArticleStatus` enum in `src/modules/reserve-cms/domain/enums/article-status.enum.ts` with values: `draft`, `published`, `archived`
- [x] T005 [P] Create barrel exports in `src/modules/reserve-cms/domain/enums/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Expand `EAdminRole` enum in `src/modules/reserve-auth/domain/enums/admin-role.enum.ts` to add `owner`, `manager`, `editor`, `viewer` values (keep `company_admin` as deprecated)
- [x] T007 Update Prisma schema in `prisma/schema.prisma`: expand `EAdminRole` enum, add `role` column to `AdminTenant` model (default: `manager`), add `EArticleStatus` enum, add `Blog`, `Article`, `ArticleImage` models per data-model.md
- [x] T008 [US1] Run `prisma migrate dev --name cms-rbac-expansion` -- apply schema changes to database (migration `20260216180743_cms_rbac_expansion`)
- [x] T009 [P] Create domain error classes in `src/modules/reserve-cms/domain/errors/`: `blog-not-found.error.ts`, `article-not-found.error.ts`, `article-slug-conflict.error.ts`, `image-limit-exceeded.error.ts`, `invalid-blog-secret-key.error.ts`, and barrel `index.ts`
- [x] T010 [P] Create `IBlogRepository` interface with Symbol token in `src/modules/reserve-cms/domain/interfaces/blog.repository.interface.ts` per data-model.md
- [x] T011 [P] Create `IArticleRepository` interface with Symbol token in `src/modules/reserve-cms/domain/interfaces/article.repository.interface.ts` per data-model.md
- [x] T012 [P] Create `IArticleImageRepository` interface with Symbol token in `src/modules/reserve-cms/domain/interfaces/article-image.repository.interface.ts` per data-model.md
- [x] T013 [P] Create `IStorageProvider` interface with Symbol token in `src/modules/reserve-cms/domain/interfaces/storage.interface.ts` per data-model.md
- [x] T014 [P] Create `IImageProcessor` interface with Symbol token in `src/modules/reserve-cms/domain/interfaces/image-processor.interface.ts` per data-model.md
- [x] T015 [P] Create barrel exports in `src/modules/reserve-cms/domain/interfaces/index.ts`
- [x] T016 Create slug generation utility function `generateSlug(title: string): string` in `src/modules/reserve-cms/domain/utils/slug.util.ts` with unit test in `src/modules/reserve-cms/domain/utils/slug.util.spec.ts`
- [x] T017 Create `reserve-cms.module.ts` skeleton in `src/modules/reserve-cms/reserve-cms.module.ts` with provider bindings (Symbol tokens -> implementations), register in `app.module.ts`

**Checkpoint**: Foundation ready -- user story implementation can now begin in parallel

---

## Phase 3: User Story 1 -- RBAC Role Expansion and Tenant-Scoped Authorization (Priority: P1) MVP

**Goal**: Expand the role hierarchy to 5 roles and enforce per-tenant authorization so that all subsequent CMS features are properly secured.

**Independent Test**: Create admins with different roles per tenant, authenticate, and verify each role can only access endpoints matching its permission level.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T018 [P] [US1] Unit test for updated `RolesGuard` per-tenant role resolution in `src/shared/auth/guards/roles.guard.spec.ts` -- test that guard checks `AdminTenant.role` when `tenant_id` is present, falls back to `Admin.role` otherwise
- [x] T019 [P] [US1] Unit test for `findRoleInTenant(adminId, tenantId)` method in `src/modules/reserve-auth/domain/interfaces/admin-tenant.repository.interface.spec.ts` (in-memory fake)

### Implementation for User Story 1

- [x] T020 [US1] Add `findRoleInTenant(adminId: number, tenantId: number): Promise<EAdminRole | null>` to `IAdminTenantRepository` interface in `src/modules/reserve-auth/domain/interfaces/admin-tenant.repository.interface.ts`
- [x] T021 [US1] Implement `findRoleInTenant()` in the Prisma adapter `src/modules/reserve-auth/infrastructure/repositories/admin-tenant.repository.ts` *(TS lint pending Prisma generate)*
- [x] T022 [US1] Create in-memory fake `InMemoryAdminTenantRepository` in `src/shared/testing/in-memory-repos/in-memory-admin-tenant.repository.ts` implementing updated interface
- [x] T023 [US1] Update `RolesGuard` in `src/shared/auth/guards/roles.guard.ts` to query `AdminTenant.role` when `request.tenant_id` exists (inject `IAdminTenantRepository`); super_admin bypasses all checks
- [x] T024 [US1] Update `CurrentAdminPayload` interface in `src/shared/auth/decorators/current-admin.decorator.ts` to include `tenant_role?: EAdminRole` field
- [ ] T025 [US1] Update seed script to map existing `AdminTenant` rows to default `manager` role in `prisma/seed.ts` *(requires running DB)*

**Checkpoint**: RBAC fully functional -- all subsequent user stories can enforce per-tenant roles

---

## Phase 4: User Story 2 -- Blog Management (Priority: P2)

**Goal**: Enable tenant managers to create, list, update, and delete blogs with auto-generated secret keys.

**Independent Test**: Create a blog, list it, update its metadata, delete it. Verify tenant-scoped isolation.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T026 [P] [US2] Unit test for `BlogService` (create, findAll, update, delete) in `src/modules/reserve-cms/application/services/blog.service.spec.ts` using in-memory fakes
- [x] T027 [P] [US2] Unit test for `BlogSecretKeyGuard` in `src/modules/reserve-cms/infrastructure/guards/blog-secret-key.guard.spec.ts`

### Implementation for User Story 2

- [x] T028 [P] [US2] Create `Blog` domain entity in `src/modules/reserve-cms/domain/entities/blog.entity.ts` (pure TypeScript, no decorators)
- [x] T029 [P] [US2] Create `CreateBlogDTO` and `UpdateBlogDTO` in `src/modules/reserve-cms/application/dtos/create-blog.dto.ts` and `src/modules/reserve-cms/application/dtos/update-blog.dto.ts` with class-validator decorators
- [x] T030 [US2] Create `InMemoryBlogRepository` in `src/shared/testing/in-memory-repos/in-memory-blog.repository.ts` implementing `IBlogRepository`
- [x] T031 [US2] Implement `PrismaBlogRepository` in `src/modules/reserve-cms/infrastructure/repositories/prisma-blog.repository.ts`
- [x] T032 [US2] Implement `BlogService` in `src/modules/reserve-cms/application/services/blog.service.ts` with create (secret key generation via `crypto`), findAll (tenant-scoped), update, and delete methods
- [x] T033 [US2] Implement `BlogSecretKeyGuard` in `src/modules/reserve-cms/infrastructure/guards/blog-secret-key.guard.ts` -- validate `x-blog-secret-key` header against SHA-256 hash stored in Blog
- [x] T034 [US2] Implement `BlogController` in `src/modules/reserve-cms/infrastructure/controllers/blog.controller.ts` per `contracts/admin-blogs.md` with Swagger decorators, guard chain (`AdminJwtGuard`, `TenantGuard`, `RolesGuard`), and minimum role enforcement
- [x] T035 [US2] Register Blog providers (repository, service, controller) in `src/modules/reserve-cms/reserve-cms.module.ts`

**Checkpoint**: Blog CRUD fully functional with tenant isolation and secret key generation

---

## Phase 5: User Story 3 -- Article Lifecycle Management (Priority: P3)

**Goal**: Enable content editors to create, edit, publish, archive, and delete articles within a blog with full lifecycle state transitions.

**Independent Test**: Create an article in draft, edit its content, publish it, verify it appears in listing, archive it, verify it disappears from published listing.

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T036 [P] [US3] Unit test for `ArticleService` (create, update, publish, archive, delete) in `src/modules/reserve-cms/application/services/article.service.spec.ts` using in-memory fakes -- test all status transitions and slug collision handling

### Implementation for User Story 3

- [x] T037 [P] [US3] Create `Article` domain entity in `src/modules/reserve-cms/domain/entities/article.entity.ts` (pure TypeScript)
- [x] T038 [P] [US3] Create `CreateArticleDTO` and `UpdateArticleDTO` in `src/modules/reserve-cms/application/dtos/create-article.dto.ts` and `src/modules/reserve-cms/application/dtos/update-article.dto.ts` with class-validator decorators
- [x] T039 [US3] Create `InMemoryArticleRepository` in `src/shared/testing/in-memory-repos/in-memory-article.repository.ts` implementing `IArticleRepository`
- [x] T040 [US3] Implement `PrismaArticleRepository` in `src/modules/reserve-cms/infrastructure/repositories/prisma-article.repository.ts`
- [x] T041 [US3] Implement `ArticleService` in `src/modules/reserve-cms/application/services/article.service.ts` with create (auto-slug), update, publish (set `published_at`), archive, unarchive (back to draft), and delete methods
- [x] T042 [US3] Implement `ArticleController` in `src/modules/reserve-cms/infrastructure/controllers/article.controller.ts` per `contracts/admin-articles.md` with Swagger decorators, guard chain, and minimum role enforcement (editor)
- [x] T043 [US3] Register Article providers (repository, service, controller) in `src/modules/reserve-cms/reserve-cms.module.ts`

**Checkpoint**: Article lifecycle fully functional -- create, edit, publish, archive, delete with slug auto-generation

---

## Phase 6: User Story 4 -- Article Image Management (Priority: P4)

**Goal**: Enable image uploads with automatic `.webp` conversion and compression, reordering, and deletion with S3 storage.

**Independent Test**: Upload a JPEG image, verify it is converted to `.webp`, reorder multiple images, delete an image and verify S3 cleanup.

### Tests for User Story 4

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T044 [P] [US4] Unit test for `SharpImageProcessorProvider` in `src/modules/reserve-cms/infrastructure/providers/sharp-image-processor.provider.spec.ts` -- test `.webp` conversion with quality and format assertions
- [x] T045 [P] [US4] Unit test for `ArticleImageService` (upload, delete, reorder, max limit) in `src/modules/reserve-cms/application/services/article-image.service.spec.ts` using in-memory fakes

### Implementation for User Story 4

- [x] T046 [P] [US4] Create `ArticleImage` domain entity in `src/modules/reserve-cms/domain/entities/article-image.entity.ts` (pure TypeScript)
- [x] T047 [P] [US4] Create `ReorderImagesDTO` in `src/modules/reserve-cms/application/dtos/reorder-images.dto.ts` with class-validator decorators
- [x] T048 [US4] Implement `SharpImageProcessorProvider` in `src/modules/reserve-cms/infrastructure/providers/sharp-image-processor.provider.ts` implementing `IImageProcessor` -- convert to `.webp` at quality 80
- [x] T049 [US4] Implement `S3StorageProvider` in `src/modules/reserve-cms/infrastructure/providers/s3-storage.provider.ts` implementing `IStorageProvider` -- reuse `@aws-sdk/client-s3` pattern from `reserve-journals`
- [x] T050 [US4] Create `InMemoryArticleImageRepository` in `src/shared/testing/in-memory-repos/in-memory-article-image.repository.ts` implementing `IArticleImageRepository`
- [x] T051 [US4] Implement `PrismaArticleImageRepository` in `src/modules/reserve-cms/infrastructure/repositories/prisma-article-image.repository.ts`
- [x] T052 [US4] Implement `ArticleImageService` in `src/modules/reserve-cms/application/services/article-image.service.ts` -- upload (process image -> store in S3 -> save record), delete (remove from S3 + DB), reorder, enforce 20-image limit
- [x] T053 [US4] Implement `ArticleImageController` in `src/modules/reserve-cms/infrastructure/controllers/article-image.controller.ts` per `contracts/admin-images.md` with `@UseInterceptors(FileInterceptor('file'))`, 10 MB multer limit, Swagger decorators, guard chain
- [x] T054 [US4] Register Image providers (repository, service, controller, S3 provider, Sharp processor) in `src/modules/reserve-cms/reserve-cms.module.ts`

**Checkpoint**: Image upload pipeline fully functional with `.webp` conversion and S3 storage

---

## Phase 7: User Story 5 -- Public Blog Content API (Priority: P5)

**Goal**: Expose a public API for frontend consumption of published articles, authenticated via blog secret key.

**Independent Test**: Provide a valid `x-blog-secret-key`, list published articles, fetch single article by slug. Verify drafts and archived articles are excluded.

### Tests for User Story 5

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T055 [P] [US5] Unit test for `PublicBlogController` endpoints in `src/modules/reserve-cms/infrastructure/controllers/public-blog.controller.spec.ts` -- test that only published articles are returned, secret key validation, and pagination

### Implementation for User Story 5

- [x] T056 [US5] Implement `PublicBlogController` in `src/modules/reserve-cms/infrastructure/controllers/public-blog.controller.ts` per `contracts/public-blog.md` with `BlogSecretKeyGuard`, pagination, published-only filtering, and `TODO(CACHE)` markers
- [x] T057 [US5] Register Public Blog controller in `src/modules/reserve-cms/reserve-cms.module.ts`

**Checkpoint**: Public API fully functional -- frontend can consume published articles via secret key

---

## Phase 8: User Story 6 -- Article Ordering (Priority: P6)

**Goal**: Allow editors to reorder articles within a blog so display order reflects editorial decisions.

**Independent Test**: Create multiple articles, reorder them, verify the new order is reflected in both admin listing and public API response.

### Implementation for User Story 6

- [x] T058 [US6] Create `ReorderArticlesDTO` in `src/modules/reserve-cms/application/dtos/reorder-articles.dto.ts` with class-validator decorators (array of `{ id, display_order }`)
- [x] T059 [US6] Add `reorderArticles(blogId, items)` method to `ArticleService` in `src/modules/reserve-cms/application/services/article.service.ts` -- validate all article IDs belong to the blog, update display_order values
- [x] T060 [US6] Add `PUT /api/cms/blogs/:blogId/articles/reorder` endpoint to `ArticleController` in `src/modules/reserve-cms/infrastructure/controllers/article.controller.ts` per `contracts/admin-articles.md`

**Checkpoint**: Article reordering functional -- editorial control over display order

---

## Phase 9: User Story 7 -- Blog Secret Key Regeneration (Priority: P7)

**Goal**: Allow tenant owners to regenerate a blog's secret key, immediately invalidating the old one.

**Independent Test**: Regenerate key, verify old key returns 401, new key returns 200.

### Tests for User Story 7

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T061 [US7] Unit test for `BlogService.regenerateSecretKey()` in `src/modules/reserve-cms/application/services/blog.service.spec.ts` -- verify old hash is replaced and new plaintext key is returned

### Implementation for User Story 7

- [x] T062 [US7] Add `regenerateSecretKey(blogId)` method to `BlogService` in `src/modules/reserve-cms/application/services/blog.service.ts` -- generate new key, hash with new salt, update Blog record, return plaintext key
- [x] T063 [US7] Add `POST /api/cms/blogs/:blogId/regenerate-key` endpoint to `BlogController` in `src/modules/reserve-cms/infrastructure/controllers/blog.controller.ts` per `contracts/admin-blogs.md` -- minimum role: `owner`

**Checkpoint**: Secret key rotation functional -- old key invalidated, new key active

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Integration testing, documentation, and finalization

- [ ] T064 [P] E2E test for complete blog lifecycle (create blog -> create article -> upload image -> publish -> public API fetch) in `test/e2e/cms.e2e-spec.ts`
- [ ] T065 [P] E2E test for RBAC enforcement (verify each role's access boundaries) in `test/e2e/cms-rbac.e2e-spec.ts`
- [x] T066 [P] Update Swagger `@ApiTags` to register `CMS Blog Management`, `CMS Article Management`, `CMS Image Management`, `CMS Public API` tag groups
- [x] T067 Verify all barrel exports in `src/modules/reserve-cms/domain/`, `src/modules/reserve-cms/application/`, update as needed
- [x] T068 Code cleanup: verify all `TODO(CACHE)` markers are present at public API endpoints and service methods per research.md
- [x] T069 Run `quickstart.md` validation: verify setup steps, env vars, migration, and API reference are accurate
- [x] T070 Update bounded context registry in `.specify/memory/constitution.md` if `reserve-cms` is not already listed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies -- can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion -- BLOCKS all user stories
- **US1 RBAC (Phase 3)**: Depends on Foundational (Phase 2) -- BLOCKS US2-US7 (provides role enforcement)
- **US2 Blog (Phase 4)**: Depends on US1 -- BLOCKS US3-US7 (blog is container for articles)
- **US3 Article (Phase 5)**: Depends on US2 -- BLOCKS US4-US6 (articles belong to blogs)
- **US4 Images (Phase 6)**: Depends on US3 -- can run in parallel with US5 and US6
- **US5 Public API (Phase 7)**: Depends on US3 -- can run in parallel with US4 and US6
- **US6 Ordering (Phase 8)**: Depends on US3 -- can run in parallel with US4 and US5
- **US7 Key Regen (Phase 9)**: Depends on US2 -- can run in parallel with US3+
- **Polish (Phase 10)**: Depends on all user stories being complete

### Critical Path

```
Phase 1 -> Phase 2 -> Phase 3 (US1) -> Phase 4 (US2) -> Phase 5 (US3) -> Phase 10 (Polish)
                                                              |
                                                              +-> Phase 6 (US4) [parallel]
                                                              +-> Phase 7 (US5) [parallel]
                                                              +-> Phase 8 (US6) [parallel]
                                                    |
                                                    +-> Phase 9 (US7) [parallel with US3+]
```

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD mandate)
- Domain entities/DTOs before services
- Services before controllers
- Core implementation before module registration
- Story complete before moving to next priority (sequential path)

### Parallel Opportunities

**Phase 2** (Foundational):
- T009, T010, T011, T012, T013, T014, T015 can all run in parallel (different files, no deps)

**Phase 4** (US2):
- T026, T027 (tests) can run in parallel
- T028, T029 (entity, DTOs) can run in parallel

**Phase 5** (US3):
- T037, T038 (entity, DTOs) can run in parallel

**Phase 6** (US4):
- T044, T045 (tests) can run in parallel
- T046, T047 (entity, DTO) can run in parallel

**After Phase 5** (US3 complete):
- Phase 6 (US4), Phase 7 (US5), Phase 8 (US6) can all run in parallel

---

## Parallel Example: User Story 2 (Blog Management)

```bash
# Launch tests first (parallel):
Task T026: "Unit test for BlogService in blog.service.spec.ts"
Task T027: "Unit test for BlogSecretKeyGuard in blog-secret-key.guard.spec.ts"

# Then launch entity + DTOs (parallel):
Task T028: "Create Blog entity in blog.entity.ts"
Task T029: "Create CreateBlogDTO and UpdateBlogDTO"

# Then sequential (dependencies):
Task T030: "InMemoryBlogRepository"
Task T031: "PrismaBlogRepository"
Task T032: "BlogService"
Task T033: "BlogSecretKeyGuard"
Task T034: "BlogController"
Task T035: "Register providers in module"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 + 3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL -- blocks all stories)
3. Complete Phase 3: US1 RBAC -- **STOP and VALIDATE**: Test role enforcement independently
4. Complete Phase 4: US2 Blog -- **STOP and VALIDATE**: Test blog CRUD with tenant isolation
5. Complete Phase 5: US3 Article -- **STOP and VALIDATE**: Test article lifecycle independently
6. **Deploy/demo if ready** -- core CMS is functional at this point

### Incremental Delivery

1. Setup + Foundational -> Foundation ready
2. Add US1 RBAC -> Test independently -> Role enforcement active
3. Add US2 Blog -> Test independently -> Blog management active
4. Add US3 Article -> Test independently -> Article lifecycle active (MVP!)
5. Add US4 Images -> Test independently -> Image management active
6. Add US5 Public API -> Test independently -> Frontend consumption ready
7. Add US6 Ordering -> Test independently -> Editorial control active
8. Add US7 Key Regen -> Test independently -> Security rotation active
9. Polish -> E2E tests, documentation, cleanup

### Parallel Team Strategy

With multiple developers after Phase 5 (US3) completion:

1. Team completes Setup + Foundational + US1 + US2 + US3 together (critical path)
2. Once US3 (Article) is done:
   - Developer A: US4 (Images) -- storage + processing pipeline
   - Developer B: US5 (Public API) -- headless CMS endpoints
   - Developer C: US6 (Ordering) + US7 (Key Regen) -- smaller tasks
3. All converge for Phase 10 (Polish)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (constitution Principle III)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All domain code MUST be pure TypeScript (constitution Principle IV)
- All repos MUST use Symbol token injection (constitution Principle II)
