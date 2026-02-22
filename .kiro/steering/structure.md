---
inclusion: always
---

# Project Structure & Architecture

## Root Directory Layout

| Directory | Purpose | Key Contents |
|-----------|---------|--------------|
| `src/` | Application source code | Modules, shared utilities, core logic |
| `prisma/` | Database layer | Schema, migrations, seeds, scripts |
| `script/` | Data processing utilities | CNPJ processing, CSV conversion, workers |
| `test/` | E2E test suites | Integration tests for critical flows |
| `docs/` | Documentation | Module docs, feature specs, migration guides |
| `temp/` | Temporary storage | File uploads, processing artifacts |
| `dist/` | Build output | Compiled TypeScript (gitignored) |

## Source Code Architecture (`src/`)

### Entry Points
- `main.ts` - Bootstrap with CORS, Swagger, ValidationPipe, global filters
- `app.module.ts` - Root module importing all bounded contexts
- `app.controller.ts` - Health check endpoint

### Core Directory Structure

```
src/
├── shared/                    # @Global() cross-cutting modules
│   ├── auth/                  # AuthModule (guards, strategies, decorators)
│   │   ├── guards/
│   │   │   ├── admin-jwt.guard.ts
│   │   │   └── user-jwt.guard.ts
│   │   ├── strategies/
│   │   ├── decorators/
│   │   │   └── current-user.decorator.ts
│   │   └── auth.module.ts
│   ├── database/              # DatabaseModule (PrismaService)
│   │   ├── prisma.service.ts
│   │   └── database.module.ts
│   ├── exceptions/            # Custom exception hierarchy
│   │   ├── domain.exception.ts
│   │   ├── repository.exception.ts
│   │   └── provider.exception.ts
│   ├── filters/               # Global exception filters
│   ├── interceptors/          # Global interceptors
│   ├── testing/               # Test utilities
│   │   └── in-memory-repos/   # Fakes for TDD
│   └── providers/             # External service wrappers
│       ├── aws-sns.provider.ts
│       ├── aws-s3.provider.ts
│       ├── encrypt.provider.ts
│       └── jwt.provider.ts
│
└── modules/                   # Bounded Contexts (zarp-* modules)
    └── [zarp-context]/        # e.g., zarp-mailer, zarp-brands
        ├── [context].module.ts
        │
        ├── domain/            # Pure TypeScript - NO NestJS decorators
        │   ├── entities/      # Business entities with behavior
        │   ├── value-objects/ # Immutable typed values
        │   ├── enums/         # Domain enums
        │   ├── interfaces/    # Repository & service contracts (ports)
        │   ├── services/      # Pure domain services
        │   ├── events/        # Domain events
        │   └── errors/        # Domain-specific errors (NO HttpException)
        │
        ├── application/       # Application business rules
        │   ├── use-cases/     # One class = one operation (primary)
        │   ├── services/      # Orchestration (for simpler modules)
        │   └── dtos/          # Input/Output DTOs with validation
        │
        └── infrastructure/    # Framework adapters
            ├── controllers/   # HTTP endpoints
            ├── presenters/    # Response formatting
            ├── repositories/  # Prisma implementations
            ├── processors/    # Queue processors
            └── providers/     # External service adapters
```

## Bounded Context Modules (zarp-*)

Each `zarp-*` module is a self-contained bounded context following DDD principles:

| Module | Route Prefix | Domain |
|--------|-------------|--------|
| `zarp-auth` | `/api/auth` | Authentication, sessions, JWT |
| `zarp-brands` | `/api/brands` | Brand management, INPI monitoring |
| `zarp-cnpjs` | `/api/cnpjs` | CNPJ lookup, company data |
| `zarp-journals` | `/api/journals` | Journal processing, alerts |
| `zarp-users` | `/api/users` | User management |
| `zarp-mailer` | `/api/mailer` | Email campaigns, leads, SMS |
| `zarp-pi-bot` | `/api/pi-bot` | AI-powered features |

## Layer Dependency Rules

```
Domain (pure TS) <-- Application (pure TS*) <-- Infrastructure (NestJS) <-- Interface (HTTP)
```

| Layer | Allowed Imports | NestJS Decorators | Framework Knowledge |
|-------|----------------|-------------------|---------------------|
| **Domain** | TypeScript stdlib only | **NONE** | **NONE** |
| **Application** | Domain types | `@Injectable()`, `@Inject()` only | **NONE** |
| **Infrastructure** | Domain + Application + frameworks | All NestJS decorators | Yes |

**Critical Rule**: Domain layer MUST be pure TypeScript. No `@Injectable()`, no `HttpException`, no Prisma types.

## File Placement Decision Tree

| What You're Creating | Where It Goes | Example |
|---------------------|---------------|---------|
| Business rule/invariant | `domain/entities/[entity].entity.ts` | `EmailCampaign.closeSetup()` |
| Validated value type | `domain/value-objects/[vo].vo.ts` | `Email`, `PhoneNumber` |
| Repository contract | `domain/interfaces/[entity].repository.interface.ts` | `IEmailCampaignRepository` |
| Domain service (pure logic) | `domain/services/[service].service.ts` | `PasswordPolicy` |
| Single business operation | `application/use-cases/[operation].use-case.ts` | `CloseCampaignSetupUseCase` |
| Orchestration service | `application/services/[entity].service.ts` | `EmailCampaignService` |
| Request/response DTO | `application/dtos/[action]-[entity].dto.ts` | `CreateEmailCampaignDTO` |
| HTTP endpoint | `infrastructure/controllers/[entity].controller.ts` | `EmailCampaignController` |
| Database operations | `infrastructure/repositories/prisma-[entity].repository.ts` | `PrismaEmailCampaignRepository` |
| External API wrapper | `infrastructure/providers/[service].provider.ts` | `NodemailerSmtpProvider` |
| Background job | `infrastructure/processors/[entity].processor.ts` | `EmailCampaignProcessor` |
| Response formatting | `infrastructure/presenters/[entity].presenter.ts` | `EmailCampaignPresenter` |

## Naming Conventions

| Element | Pattern | Example |
|---------|---------|---------|
| Module folders | `kebab-case` | `zarp-mailer/`, `zarp-brands/` |
| Files | `kebab-case` | `email-campaign.service.ts` |
| Classes | `PascalCase` | `EmailCampaignService` |
| Interfaces | `I` prefix | `IEmailCampaignRepository` |
| Interface tokens | `UPPER_SNAKE_CASE` | `EMAIL_CAMPAIGN_REPOSITORY` |
| Enums | `E` prefix | `ECampaignStatus` |
| DTOs | Suffix `DTO` | `CreateEmailCampaignDTO` |
| Value Objects | Suffix `.vo.ts` | `email-address.vo.ts` |
| Entities | Suffix `.entity.ts` | `email-campaign.entity.ts` |
| Repositories (impl) | `Prisma` prefix | `PrismaEmailCampaignRepository` |
| Use Cases | Suffix `.use-case.ts` | `close-campaign-setup.use-case.ts` |
| DB columns | `snake_case` | `created_at`, `phone_number` |
| Variables/Functions | `camelCase` | `findAllCampaigns()`, `totalLeads` |
| Constants | `camelCase` | `errorCreateCampaign` |

## Database Layer (`prisma/`)

```
prisma/
├── schema.prisma              # Prisma schema with PostgreSQL
├── migrations/                # Timestamped migration folders
│   └── [timestamp]_[name]/
│       └── migration.sql
├── seeds/                     # Organized seed data
│   ├── shared/                # Cross-module seeds (plans, tokens)
│   ├── zarp-auth/             # Auth-specific seeds
│   └── zarp-cms/              # CMS-specific seeds
├── scripts/                   # Verification and utility scripts
└── archived/                  # Legacy migrations and seeds
```

**Repository Pattern**: All database access goes through repository interfaces defined in `domain/interfaces/` and implemented in `infrastructure/repositories/`.

## API Versioning Strategy

| Version | Status | Architecture | Location |
|---------|--------|--------------|----------|
| **v1** | Legacy (being phased out) | Direct controller/service | `src/modules/v1/` |
| **v2** | Current | DDD modular with bounded contexts | `src/modules/[zarp-*]/` |

**Migration Path**: New features go to v2 only. v1 endpoints maintained for backward compatibility but not extended.

## Module Encapsulation Rules

Each bounded context module MUST:
1. Declare its own providers (repositories, services, use cases)
2. Export only what other modules need (typically the application service)
3. Never import another context's internal classes - only its exported module
4. Define domain interfaces using Symbol tokens
5. Register implementations via `provide/useClass` pattern

**Cross-Context Communication**:
```typescript
// zarp-mailer needs user data from zarp-users
@Module({
  imports: [ZarpUsersModule],  // Import MODULE, not service directly
  providers: [EmailCampaignService],
})
export class ZarpMailerModule {}
```

## Shared Module Pattern

`shared/` contains @Global() modules available everywhere:
- `DatabaseModule` - Provides `PrismaService`
- `AuthModule` - Provides guards and decorators
- **No business logic in shared/** - only cross-cutting infrastructure

## Testing Structure

```
src/
└── [module]/
    ├── domain/
    │   └── entities/
    │       ├── entity.ts
    │       └── entity.spec.ts        # Unit tests (no DB, no framework)
    ├── application/
    │   └── use-cases/
    │       ├── use-case.ts
    │       └── use-case.spec.ts      # Unit tests with in-memory repos
    └── infrastructure/
        └── repositories/
            ├── repository.ts
            └── repository.spec.ts    # Integration tests with test DB

test/
└── *.e2e-spec.ts                     # E2E tests (few, critical flows only)
```

**Test Pyramid**: Many unit tests, some integration tests, few E2E tests.

## Key Architectural Patterns

| Pattern | Implementation | Purpose |
|---------|---------------|---------|
| **Dependency Inversion** | Interface tokens + `provide/useClass` | Decouple domain from infrastructure |
| **Repository Pattern** | Domain interfaces + Prisma adapters | Abstract data access |
| **Use Case Pattern** | One class = one operation | Single Responsibility |
| **Ports & Adapters** | Domain ports + Infrastructure adapters | Hexagonal architecture |
| **Domain Events** | Event emitters in domain | Decouple side effects |
| **Service Response** | Typed `ServiceResponse<T>` | Consistent error handling |

## Common Anti-Patterns to Avoid

| Anti-Pattern | Correct Approach |
|-------------|------------------|
| NestJS decorators in domain layer | Domain is pure TypeScript |
| Importing Prisma types in domain | Map to domain entities in repository |
| Business logic in controller | Move to use case or domain entity |
| God service with 20+ methods | Split into focused use cases |
| Raw `prismaClient` singleton | Inject `PrismaService` via DI |
| Repository returning Prisma types | Map to domain entities with `toDomain()` |
| HTTP status codes in domain errors | Domain uses business errors; interface translates |