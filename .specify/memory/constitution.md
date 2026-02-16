<!--
SYNC IMPACT REPORT
===================
Version change: N/A -> 1.0.0
Modified principles: N/A (initial ratification)
Added sections:
  - Core Principles (7 principles)
  - Technology Stack & Constraints
  - Development Workflow & Quality Gates
  - Governance
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md: ✅ aligned (Constitution Check section present)
  - .specify/templates/spec-template.md: ✅ aligned (User Stories + Requirements structure)
  - .specify/templates/tasks-template.md: ✅ aligned (phased delivery + user story grouping)
Follow-up TODOs: None
-->

# API Zarp-Admin Constitution

## Core Principles

### I. Domain-Driven Design (Bounded Contexts)

The codebase is organized into **bounded contexts** using the `zarp-` prefix convention.
Each context is a self-contained NestJS module encapsulating its own domain,
application, and infrastructure layers.

- Every bounded context MUST reside under `src/modules/zarp-{context}/`.
- Each context MUST expose a single NestJS module as its entry point: `{context}.module.ts`.
- Cross-context communication MUST use domain events or shared interfaces, never direct
  imports of another context's internal classes.
- A bounded context MUST NOT import entities, repositories, or services from another
  context's `domain/` or `application/` layers.
- New business capabilities MUST be evaluated as either a new bounded context or an
  extension of an existing one before implementation begins.

**Rationale**: Bounded contexts enforce strong encapsulation, reduce coupling, and allow
independent evolution of business domains. The `zarp-` prefix provides a discoverable
and consistent naming convention across the monolith.

### II. SOLID Principles (Dependency Inversion as Core Pattern)

All code MUST adhere to SOLID principles, with **Dependency Inversion (DIP)** as the
primary architectural pattern.

- Every bounded context MUST define **interfaces (ports)** in `domain/interfaces/`.
- Concrete implementations (adapters) MUST live in `infrastructure/`.
- Injection MUST use **Symbol tokens** (`provide` + `useClass` in module providers).
- Application and domain layers MUST depend on abstractions only; they MUST NOT import
  infrastructure classes directly.
- Interfaces MUST be focused and minimal (Interface Segregation); a single
  "god interface" covering all repository methods is prohibited.
- Each class MUST have a single reason to change (Single Responsibility): controllers
  handle HTTP, use cases handle orchestration, repositories handle persistence.

**Rationale**: DIP enables swappable implementations (e.g., in-memory fakes for TDD,
Prisma for production), keeps the domain framework-agnostic, and supports the
Liskov Substitution and Open/Closed principles naturally.

### III. Test-Driven Development (NON-NEGOTIABLE)

TDD is the mandatory development methodology. Tests drive design decisions and
establish contracts before implementation.

- Tests MUST be written **before** implementation code (Red-Green-Refactor cycle).
- Unit tests MUST use **in-memory repository fakes** from `shared/testing/in-memory-repos/`.
- Domain logic MUST be testable independently from NestJS and Prisma.
- Integration tests MUST cover critical cross-layer flows (controller-to-repository).
- E2E tests (Supertest) MUST validate complete HTTP request/response cycles for
  critical user journeys.
- Test files MUST follow the `*.spec.ts` naming convention and reside alongside their
  source files.

**Rationale**: TDD forces early design thinking, reduces regressions, clarifies
contracts between layers, and ensures every feature is provably correct before merge.

### IV. Domain Layer Purity (CRITICAL)

The domain layer MUST be **pure TypeScript**. No framework, ORM, or HTTP concepts
are permitted in domain code.

- Domain entities, value objects, enums, services, and errors MUST NOT use NestJS
  decorators (`@Injectable`, `@Controller`, etc.).
- Domain errors MUST NOT extend `HttpException` or reference HTTP status codes.
- Domain types MUST NOT import Prisma types, database models, or ORM utilities.
- The domain speaks the **language of the business** (ubiquitous language), not the
  language of the framework.
- Error translation MUST happen at the infrastructure/interface layer: domain errors map
  to HTTP status codes in controllers or exception filters.

**Rationale**: A pure domain layer is portable, testable without infrastructure, and
forces the team to think in business terms rather than framework terms. This is the
most important architectural boundary in the project.

### V. Proportional Architecture

Apply **more DDD ceremony** where there is business complexity; **less** where it is
I/O and boilerplate. Not every module deserves full DDD treatment.

| Module Complexity | Approach |
|---|---|
| Complex domain rules, invariants, multiple states | Full DDD: entities, value objects, use cases, domain events, repository interfaces |
| Moderate logic with some orchestration | DDD-lite: entities, services with interface-based repos |
| Simple CRUD, admin panels, boilerplate | Lean: service + repository, minimal domain layer |

- Creating aggregates and bounded contexts for trivial CRUD is waste and MUST be avoided.
- Conversely, a monolithic service with 1000+ lines is NOT DDD and MUST be refactored
  into focused use cases.
- The chosen complexity tier MUST be documented in the feature's implementation plan.

**Rationale**: Over-engineering simple features wastes time; under-engineering complex
features creates tech debt. The proportionality principle ensures the right level of
abstraction for each module.

### VI. Multi-Tenant Security & RBAC

The system MUST support multi-tenant operations with role-based access control.

- Authentication MUST use JWT tokens containing tenant context and role information.
- Authorization MUST be enforced via NestJS guards (`RolesGuard`) at the
  controller/route level.
- Tenant isolation MUST be guaranteed: queries MUST be scoped to the authenticated
  tenant unless the actor is a super-admin.
- Public APIs (e.g., blog endpoints) MUST use **secret key guards**
  (`x-blog-secret-key` header) instead of JWT.
- Role hierarchy MUST follow: `super_admin > owner > manager > editor > viewer`.
- Every new module with protected routes MUST declare minimum required roles in the
  API route table and enforce them with decorators.

**Rationale**: Multi-tenant SaaS requires strict isolation between tenants. RBAC
ensures least-privilege access. The secret key pattern enables headless CMS
consumption by frontend clients without exposing admin authentication.

### VII. Incremental Delivery & Simplicity

Features MUST be delivered incrementally following KISS, YAGNI, and composition
over inheritance principles.

- Features MUST be broken into independently deployable phases (sprints).
- Each phase MUST produce a demonstrable, testable increment.
- Speculative features MUST NOT be implemented until explicitly required (YAGNI).
- Code duplication MUST be eliminated through shared abstractions, not copy-paste (DRY).
- Deferred capabilities MUST be marked with `TODO({CAPABILITY}): {explanation}` comments
  to ensure future discoverability.
- Data MUST be treated as immutable where possible to avoid side effects.
- Composition MUST be preferred over inheritance for combining behaviors.

**Rationale**: Incremental delivery reduces risk, enables early feedback, and ensures
the team builds only what is needed. TODO markers prevent deferred items from being
forgotten while avoiding premature optimization.

## Technology Stack & Constraints

| Layer | Technology | Version |
|---|---|---|
| **Framework** | NestJS (modular architecture) | 11.x |
| **Language** | TypeScript (strict mode) | 5.x |
| **ORM** | Prisma with `@prisma/adapter-pg` | 7.x |
| **Database** | PostgreSQL | - |
| **Validation** | class-validator + class-transformer (DTOs), Zod (domain rules) | - |
| **API Docs** | @nestjs/swagger with ApiProperty decorators | - |
| **Auth** | JWT (jsonwebtoken), PBKDF2 SHA-512 password hashing | - |
| **Queue** | BullMQ via @nestjs/bull (async jobs) | - |
| **Cloud** | AWS SNS (SMS), AWS S3 (storage), Nodemailer (SMTP) | - |
| **Payments** | Stripe | - |
| **AI** | Vercel AI SDK with Azure OpenAI | - |
| **Testing** | Jest + Supertest | - |
| **Package Manager** | pnpm | - |

### Constraints

- All modules MUST use absolute imports with `@/` prefix where configured, falling back
  to relative imports only when strictly necessary.
- Image uploads MUST be received in any format, compressed, optimized, and converted
  to `.webp` without significant quality loss. Maximum upload size: **10 MB**.
- Commands MUST be PowerShell-compatible.
- File naming MUST follow established conventions: `*.entity.ts`, `*.vo.ts`,
  `*.use-case.ts`, `*.service.ts`, `*.controller.ts`, `*.repository.ts`,
  `*.interface.ts`, `*.dto.ts`.

## Development Workflow & Quality Gates

### Layer Dependency Direction

```
Domain  <--  Application  <--  Infrastructure  <--  Interface (HTTP/CLI)
(pure TS)    (pure TS*)        (NestJS, Prisma)      (NestJS controllers)
```

*Application MAY use `@Injectable()` for NestJS DI integration but MUST avoid other
framework dependencies.

### Quality Gates

1. **Pre-Implementation**: Feature MUST have a specification (`/speckit.specify`) or
   implementation plan before coding begins.
2. **Constitution Check**: Every implementation plan MUST verify compliance with these
   principles before Phase 0 research and again after Phase 1 design.
3. **Test-First Gate**: Tests MUST exist and fail (red) before implementation code is
   written (green).
4. **Domain Purity Gate**: No PR may introduce NestJS decorators, `HttpException`,
   or Prisma types into a `domain/` directory.
5. **Swagger Documentation**: Every new endpoint MUST be documented with
   `@nestjs/swagger` decorators.
6. **Review**: All PRs MUST verify compliance with these principles. Complexity MUST
   be justified in the implementation plan's Complexity Tracking table.

### Bounded Context Registry

| Bounded Context | Route Prefix | Domain Scope |
|---|---|---|
| `zarp-auth` | `/api/auth` | Admin & user authentication, sessions, JWT |
| `zarp-brands` | `/api/brands` | Brand management and brand analysis |
| `zarp-cnpjs` | `/api/cnpjs` | CNPJ lookup, company data, CNAE codes |
| `zarp-journals` | `/api/journals` | Journal/publications, alerts, posts |
| `zarp-users` | `/api/users` | User CRUD, profiles, permissions |
| `zarp-mailer` | `/api/mailer` | Email campaigns, SMTP config, leads, SMS events |
| `zarp-pi-bot` | `/api/pi-bot` | AI-powered bot features |
| `zarp-cms` | `/api/cms` | Blog management, articles, public content API |

This registry MUST be updated when a new bounded context is introduced.

## Governance

- This constitution **supersedes** all other development practices and conventions
  when conflicts arise.
- Amendments REQUIRE: (1) documentation of the change rationale, (2) review approval,
  and (3) a migration plan for affected code if principles are removed or redefined.
- All PRs and reviews MUST verify compliance with these principles.
- Complexity beyond what the constitution allows MUST be explicitly justified.
- Use the `.agent/rules/nestjs.md` file for detailed runtime development guidance
  that complements this constitution.
- Version increments follow semantic versioning:
  - **MAJOR**: Backward-incompatible governance/principle removals or redefinitions.
  - **MINOR**: New principle/section added or materially expanded guidance.
  - **PATCH**: Clarifications, wording, typo fixes, non-semantic refinements.

**Version**: 1.0.0 | **Ratified**: 2026-02-16 | **Last Amended**: 2026-02-16
