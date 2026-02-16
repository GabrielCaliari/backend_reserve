# Implementation Plan: Multi-Tenant CMS with Blog and RBAC

**Branch**: `001-multi-tenant-cms-rbac` | **Date**: 2026-02-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-multi-tenant-cms-rbac/spec.md`

## Summary

Implement a multi-tenant CMS module (`zarp-cms`) enabling tenant-scoped blog management with
a granular RBAC role hierarchy. The feature expands the existing `EAdminRole` enum from 2 to 5
roles, moves role assignment to the per-tenant level (AdminTenant), introduces Blog, Article,
and ArticleImage entities with full lifecycle management, integrates S3 storage with `sharp`
image processing for automatic `.webp` conversion, and exposes a headless public API
authenticated via secret keys.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: NestJS 11.x, Prisma 7.x, sharp (new), @aws-sdk/client-s3 (existing), class-validator, class-transformer, zod
**Storage**: PostgreSQL (Prisma ORM) + AWS S3-compatible object storage (DigitalOcean Spaces, existing)
**Testing**: Jest + Supertest, in-memory repository fakes
**Target Platform**: Node.js server (Linux production)
**Project Type**: Single project (NestJS modular monolith)
**Performance Goals**: Public API response < 500ms p95 for article listing (cacheable in future)
**Constraints**: Max 10 MB upload per image, max 20 images per article, all images converted to `.webp`
**Scale/Scope**: Multi-tenant SaaS, initial target ~10 tenants with ~50 articles each

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Pre-Phase 0 | Post-Phase 1 | Notes |
|---|---|---|---|
| I. Bounded Contexts | PASS | PASS | New `zarp-cms` context under `src/modules/zarp-cms/` |
| II. SOLID/DIP | PASS | PASS | All repos behind Symbol tokens; IStorageProvider abstraction for S3 |
| III. TDD | PASS | PASS | In-memory fakes for all CMS repos; test-first mandate |
| IV. Domain Purity | PASS | PASS | Domain entities are pure TS; domain errors do not extend HttpException |
| V. Proportional Architecture | PASS | PASS | DDD-lite tier: entities + services with interface-based repos |
| VI. Multi-Tenant Security | PASS | PASS | TenantGuard + RolesGuard (updated for per-tenant roles) + BlogSecretKeyGuard |
| VII. Incremental Delivery | PASS | PASS | 4 phases, each independently deployable |

## Project Structure

### Documentation (this feature)

```text
specs/001-multi-tenant-cms-rbac/
├── plan.md              # This file
├── research.md          # Phase 0 output - decisions and rationale
├── data-model.md        # Phase 1 output - entities, fields, relationships
├── quickstart.md        # Phase 1 output - developer onboarding
├── contracts/           # Phase 1 output - API contracts
│   ├── admin-blogs.md
│   ├── admin-articles.md
│   ├── admin-images.md
│   └── public-blog.md
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/modules/zarp-cms/
├── domain/
│   ├── entities/
│   │   ├── blog.entity.ts
│   │   ├── article.entity.ts
│   │   └── article-image.entity.ts
│   ├── enums/
│   │   ├── article-status.enum.ts
│   │   └── index.ts
│   ├── errors/
│   │   ├── blog-not-found.error.ts
│   │   ├── article-not-found.error.ts
│   │   ├── article-slug-conflict.error.ts
│   │   ├── image-limit-exceeded.error.ts
│   │   ├── invalid-blog-secret-key.error.ts
│   │   └── index.ts
│   └── interfaces/
│       ├── blog.repository.interface.ts
│       ├── article.repository.interface.ts
│       ├── article-image.repository.interface.ts
│       ├── storage.interface.ts
│       ├── image-processor.interface.ts
│       └── index.ts
├── application/
│   ├── dtos/
│   │   ├── create-blog.dto.ts
│   │   ├── update-blog.dto.ts
│   │   ├── create-article.dto.ts
│   │   ├── update-article.dto.ts
│   │   ├── reorder-articles.dto.ts
│   │   ├── reorder-images.dto.ts
│   │   └── index.ts
│   └── services/
│       ├── blog.service.ts
│       ├── article.service.ts
│       ├── article-image.service.ts
│       └── index.ts
├── infrastructure/
│   ├── controllers/
│   │   ├── blog.controller.ts
│   │   ├── article.controller.ts
│   │   ├── article-image.controller.ts
│   │   └── public-blog.controller.ts
│   ├── repositories/
│   │   ├── prisma-blog.repository.ts
│   │   ├── prisma-article.repository.ts
│   │   └── prisma-article-image.repository.ts
│   ├── guards/
│   │   └── blog-secret-key.guard.ts
│   └── providers/
│       ├── s3-storage.provider.ts
│       └── sharp-image-processor.provider.ts
└── zarp-cms.module.ts

# Changes to existing code (zarp-auth):
src/modules/zarp-auth/
├── domain/enums/admin-role.enum.ts           # Expand EAdminRole enum
├── domain/interfaces/admin-tenant.repository.interface.ts  # Add findRoleInTenant()
src/shared/auth/
├── guards/roles.guard.ts                     # Update to check per-tenant role
├── decorators/current-admin.decorator.ts     # Extend payload with tenant_role

# Prisma schema updates:
prisma/schema.prisma                          # New models + AdminTenant.role column
```

**Structure Decision**: Single NestJS modular monolith. The `zarp-cms` bounded context follows
the same layer structure as `zarp-auth` (domain/application/infrastructure). Image processing
is abstracted behind `IImageProcessor` interface (infrastructure: `sharp`). Object storage is
abstracted behind `IStorageProvider` interface (infrastructure: `@aws-sdk/client-s3`).

**Complexity Tier**: DDD-lite -- entities with services and interface-based repositories. No
full aggregates, value objects, or domain events needed at this stage. Article status transitions
are handled by service methods, not complex domain logic.

## Complexity Tracking

> No constitutional violations detected. All design decisions align with established principles.
> The table below is empty intentionally.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| _(none)_  | _(none)_   | _(none)_                             |
