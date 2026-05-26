---
trigger: model_decision
description: This file describes the NestJS backend API architecture guidelines with SOLID principles and DDD patterns applied to APIs projects.
---

# NestJS API Guidelines - TDD + DDD + SRP

## 1. Architecture Philosophy

This project follows **TDD (Test-Driven Development)**, **DDD (Domain-Driven Design)**, and **SRP (Single Responsibility Principle)** as its foundational pillars.

| Pillar | Purpose |
| ------ | ------- |
| **TDD** | Forces feedback rapido, clarifies contracts, reduces regressions. The real value is thinking about design through tests. |
| **DDD** | Focuses on the business core. Models the domain with ubiquitous language, aggregates, entities, and use cases. |
| **SRP** | Prevents "do-everything" classes. Each component has a single reason to change, making refactoring and testing easier. |

**Synergy**: TDD drives design; DDD organizes code around the domain; SRP keeps pieces small. In NestJS this results in clear layers: **Domain -> Application -> Infrastructure -> Interface (HTTP/CLI/etc.)**.

### Proportionality Principle

Apply **more DDD** where there is business complexity; **less** where it is I/O and boilerplate. Not every module deserves full DDD ceremony.

| Module Complexity | Approach |
| ----------------- | -------- |
| Complex domain rules, invariants, multiple states | Full DDD: entities, VOs, use cases, domain events, repository interfaces |
| Moderate logic with some orchestration | DDD-lite: entities, services with interface-based repos |
| Simple CRUD, admin panels, boilerplate | Lean: service + repository, minimal domain layer |

> **Anti-pattern**: Creating aggregates and bounded contexts for trivial CRUD is waste. Conversely, a fat `FooService` with 1000 lines is NOT DDD.

---

## 2. Role & Principles

Senior NestJS developer with TypeScript strict mode, SOLID principles, and Domain-Driven Design expertise.

| Principle                  | Implementation                                                            |
| -------------------------- | ------------------------------------------------------------------------- |
| Single Responsibility      | Each class has one reason to change: controller routes, use case logic, repository data |
| Open/Closed                | Extend via interfaces and abstractions, not modifying existing classes     |
| Liskov Substitution        | Program against interfaces; implementations are swappable                 |
| Interface Segregation      | Small, focused interfaces per consumer need                               |
| Dependency Inversion       | Depend on abstractions (interfaces/tokens), inject implementations via DI |

---

## 3. Technology Stack

| Layer          | Technologies                                                               |
| -------------- | -------------------------------------------------------------------------- |
| **Framework**  | NestJS 11 (App Router), TypeScript 5+ strict                               |
| **ORM**        | Prisma 7 with `@prisma/adapter-pg` (PostgreSQL)                            |
| **Validation** | class-validator + class-transformer (DTOs), Zod (domain rules)             |
| **Docs**       | @nestjs/swagger with ApiProperty decorators                                |
| **Auth**       | JWT (jsonwebtoken), PBKDF2 SHA-512 password hashing                        |
| **Queue**      | BullMQ via @nestjs/bull (async jobs)                                       |
| **Providers**  | AWS SNS (SMS), AWS S3 (storage), Nodemailer (SMTP), Stripe (payments)      |
| **AI**         | Vercel AI SDK with Azure OpenAI                                            |
| **Testing**    | Jest + Supertest                                                           |

---

## 4. Bounded Contexts (Domain Modules)

The project is organized into **bounded contexts** named with the `reserve-` prefix. Each context is a self-contained NestJS module with its own domain, application, and infrastructure layers.

### Module Registry

| Bounded Context   | Route Prefix           | Domain Scope                                    |
| ----------------- | ---------------------- | ----------------------------------------------- |
| `reserve-auth`       | `/api/auth`            | Admin & user authentication, sessions, JWT      |
| `reserve-brands`     | `/api/brands`          | Brand management and brand analysis             |
| `reserve-cnpjs`      | `/api/cnpjs`           | CNPJ lookup, company data, CNAE codes           |
| `reserve-journals`   | `/api/journals`        | Journal/publications, alerts, posts             |
| `reserve-users`      | `/api/users`           | User CRUD, profiles, permissions                |
| `reserve-mailer`     | `/api/mailer`          | Email campaigns, SMTP config, leads, SMS events |
| `reserve-pi-bot`     | `/api/pi-bot`          | AI-powered bot features                         |

---

## 5. Project Structure

```
src/
├── app.module.ts                 # Root module - only imports bounded context modules
├── main.ts                       # Bootstrap, CORS, Swagger, ValidationPipe
│
├── shared/                       # Cross-cutting concerns (GLOBAL modules)
│   ├── auth/                     # AuthModule (guards, JWT, session)
│   │   ├── guards/
│   │   ├── strategies/
│   │   ├── decorators/
│   │   └── auth.module.ts        # @Global() - available everywhere
│   ├── database/                 # DatabaseModule (Prisma singleton)
│   │   ├── prisma.service.ts     # Injectable PrismaClient wrapper
│   │   └── database.module.ts    # @Global() - provides PrismaService
│   ├── exceptions/               # Custom exceptions hierarchy
│   ├── filters/                  # Global exception filters
│   ├── interceptors/             # Global interceptors
│   ├── testing/                  # Shared test utilities
│   │   └── in-memory-repos/      # In-memory repository fakes for TDD
│   └── providers/                # External service wrappers
│
├── modules/                      # Bounded Contexts
│   └── [reserve-context]/           # e.g.: reserve-mailer, reserve-brands
│       ├── [context].module.ts   # NestJS Module definition
│       │
│       ├── domain/               # Enterprise Business Rules (PURE TypeScript)
│       │   ├── entities/         # Domain entities with behavior
│       │   ├── value-objects/    # Immutable typed values
│       │   ├── enums/            # Domain enums
│       │   ├── interfaces/       # Repository & service contracts (ports)
│       │   ├── services/         # Domain services (pure business rules)
│       │   ├── events/           # Domain events
│       │   └── errors/           # Domain-specific errors (NO HttpException)
│       │
│       ├── application/          # Application Business Rules
│       │   ├── use-cases/        # One class = one business operation (primary)
│       │   ├── services/         # Orchestration services (for simpler modules)
│       │   └── dtos/             # Input/Output DTOs
│       │
│       └── infrastructure/       # Frameworks & Adapters
│           ├── controllers/      # HTTP adapters (interface layer)
│           ├── presenters/       # Response formatting/mapping
│           ├── repositories/     # Prisma implementations (adapters)
│           ├── processors/       # Queue processors
│           └── providers/        # External service adapters
│
├── @types/                       # Legacy global type definitions
└── core/                         # Legacy utilities (deprecate gradually)
```

---

## 6. Layer Rules & Purity

### Layer Dependency Direction

```
Domain  <--  Application  <--  Infrastructure  <--  Interface (HTTP/CLI)
(pure TS)    (pure TS*)        (NestJS, Prisma)      (NestJS controllers)
```

*Application may use `@Injectable()` for NestJS DI integration, but should avoid other framework dependencies.

| Layer | Allowed Imports | NestJS Decorators | HTTP Knowledge |
| ----- | --------------- | ----------------- | -------------- |
| **Domain** | Only TypeScript/stdlib | **NONE** | **NONE** |
| **Application** | Domain types | `@Injectable()`, `@Inject()` only | **NONE** |
| **Infrastructure** | Domain + Application types, frameworks | All NestJS decorators | Yes (controllers) |

### Domain Layer Purity (Critical Rule)

> **The Domain layer MUST be pure TypeScript. No NestJS decorators, no `HttpException`, no Prisma types, no framework imports.** The domain speaks the language of the business, not of the framework.

**Rules:**
- Domain entities contain only pure business logic
- No decorators allowed in domain layer
- No framework dependencies
- No database-specific types

### Domain Errors vs HTTP Errors

- **Domain**: Throws domain-language errors (business rule violations) - no HTTP status codes
- **Application**: Converts domain errors to result types with `Ok/Err` patterns
- **Infrastructure/Interface**: Translates to HTTP status codes (422, 409, 404, 401)

---

## 7. SOLID in Practice

### 7.1 Dependency Inversion (DIP) - The Core Pattern

**Rules:**
- Every bounded context defines **interfaces** in `domain/interfaces/`
- Implementations live in `infrastructure/`
- Module wires them together using NestJS custom providers
- Use Symbol tokens for injection identifiers
- Application and domain layers depend on abstractions only
- Infrastructure provides concrete implementations

### Interface Definition Requirements:
- Define a Symbol constant for the injection token
- Export the interface with all required methods
- Document expected behavior in JSDoc comments
- Keep interfaces focused and minimal (Interface Segregation)

### Module Provider Configuration:
- Use custom providers with `provide` and `useClass`
- Register interface implementations in module providers array
- Inject using `@Inject(SYMBOL_TOKEN)` in consumers

---

## 8. Additional Rules

### File Naming Conventions:
- Entities: `*.entity.ts`
- Value Objects: `*.vo.ts`
- Use Cases: `*.use-case.ts`
- Services: `*.service.ts`
- Controllers: `*.controller.ts`
- Repositories: `*-[implementation].repository.ts` (e.g., `prisma-user.repository.ts`)
- Interfaces: `*.interface.ts`
- DTOs: `*.dto.ts`

### Testing Requirements:
- Write tests before implementation (TDD)
- Use in-memory repository fakes for unit tests
- Keep tests isolated from infrastructure
- Test domain logic independently from framework

### Module Organization:
- Each bounded context is self-contained
- Shared concerns go in `shared/` as global modules
- Avoid circular dependencies between contexts
- Use events for cross-context communication when needed