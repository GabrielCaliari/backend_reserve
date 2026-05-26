# Implementation Plan: Lead Collections per Tenant

**Branch**: `002-lead-collections` | **Date**: 2026-02-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-lead-collections/spec.md`

## Summary

Extend the `reserve-leads` bounded context to support **LeadCollections** -- tenant-scoped containers that organize leads by source with configurable access modes (public, private/CORS, restricted/auth). Each collection exposes a dynamic capture endpoint (`/leads/collect/:slug`) whose security posture is driven by its access mode. Admin operations enforce tenant isolation via existing guards and RBAC hierarchy.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: NestJS 11.x, Prisma 7.x, class-validator, class-transformer, @nestjs/swagger
**Storage**: PostgreSQL (via Prisma)
**Testing**: Jest + Supertest (TDD -- tests first)
**Target Platform**: Linux server (Node.js)
**Project Type**: web (backend API monolith)
**Performance Goals**: Public capture endpoints respond in under 500ms; admin list endpoints respond in under 2s
**Constraints**: Multi-tenant isolation; RBAC hierarchy enforcement; backward compatibility with existing Lead records (optional collection FK)
**Scale/Scope**: Extension of existing `reserve-leads` bounded context; 1 new Prisma model, 1 extended model, 3-4 new controllers, 2 new services, 2 new repositories

**Complexity Tier**: DDD-lite (moderate logic with orchestration -- access mode enforcement, dynamic guards, secret key management, tenant scoping)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. DDD (Bounded Contexts) | PASS | Extends existing `reserve-leads` context under `src/modules/reserve-leads/`. No new bounded context needed -- collections are a natural extension of lead management. |
| II. SOLID / DIP | PASS | New interfaces in `domain/interfaces/` for `ILeadCollectionRepository`. Symbol token injection. Controllers depend on abstractions. |
| III. TDD | PASS | Tests must be written before implementation. In-memory fakes for LeadCollectionRepository. |
| IV. Domain Purity | PASS | `LeadCollection` entity, `EAccessMode` enum, domain errors -- all pure TypeScript. No NestJS/Prisma in domain layer. |
| V. Proportional Architecture | PASS | DDD-lite tier: entities, services with interface-based repos. No full aggregates or domain events needed. |
| VI. Multi-Tenant & RBAC | PASS | Reuses existing `AdminJwtGuard`, `TenantGuard`, `RolesGuard`. New `CollectionSecretKeyGuard` follows `BlogSecretKeyGuard` pattern. |
| VII. Incremental Delivery | PASS | Feature broken into 4 phases matching user story priorities. Each phase is independently deployable. |

**Constitution Check Result**: ALL GATES PASS. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/002-lead-collections/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── admin-collections.yaml    # Admin CRUD endpoints
│   ├── capture.yaml              # Public/dynamic capture endpoint
│   └── admin-collection-leads.yaml  # Admin lead listing by collection
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/modules/reserve-leads/
├── domain/
│   ├── entities/
│   │   ├── lead.entity.ts                   # MODIFIED: add optional collection_id
│   │   └── lead-collection.entity.ts        # NEW: LeadCollection entity
│   ├── enums/
│   │   ├── lead.enum.ts
│   │   ├── temperature.enum.ts
│   │   └── access-mode.enum.ts              # NEW: EAccessMode enum
│   ├── errors/
│   │   ├── collection-not-found.error.ts    # NEW
│   │   ├── collection-slug-conflict.error.ts # NEW
│   │   ├── collection-inactive.error.ts     # NEW
│   │   └── invalid-collection-key.error.ts  # NEW
│   ├── interfaces/
│   │   ├── index.ts                         # MODIFIED: export new symbols
│   │   ├── lead.repository.interface.ts
│   │   └── lead-collection.repository.interface.ts  # NEW
│   └── constants/
│       ├── index.ts                         # MODIFIED: add new error messages
│       └── error-messages.ts                # MODIFIED
├── application/
│   ├── dtos/
│   │   ├── lead.dto.ts                      # MODIFIED: add collection_slug param
│   │   ├── create-collection.dto.ts         # NEW
│   │   ├── update-collection.dto.ts         # NEW
│   │   └── index.ts                         # MODIFIED
│   └── services/
│       ├── lead.service.ts                  # MODIFIED: collection-scoped queries
│       ├── lead-collection.service.ts       # NEW: collection CRUD + key management
│       ├── lead-collection.service.spec.ts  # NEW: unit tests
│       └── index.ts                         # MODIFIED
├── infrastructure/
│   ├── controllers/
│   │   ├── lead.controller.ts               # MODIFIED: collection-scoped lead routes
│   │   ├── lead-collection.controller.ts    # NEW: admin CRUD for collections
│   │   └── lead-capture.controller.ts       # NEW: public capture endpoint
│   ├── guards/
│   │   └── collection-secret-key.guard.ts   # NEW: mirrors BlogSecretKeyGuard
│   └── repositories/
│       ├── lead.repository.ts               # MODIFIED: collection_id support
│       └── lead-collection.repository.ts    # NEW: Prisma implementation
└── reserve-leads.module.ts                     # MODIFIED: register new providers

prisma/
└── schema.prisma                            # MODIFIED: add LeadCollection model, extend Lead
```

**Structure Decision**: Extends the existing `reserve-leads` bounded context. No new module needed. Collections are a natural part of the lead management domain. The structure follows the established DDD-lite pattern used by `reserve-cms` (entities, services with interface-based repos, guards for access control).

## Complexity Tracking

> No violations detected. Constitution Check passed all gates.
