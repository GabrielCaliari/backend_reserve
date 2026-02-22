---
inclusion: always
---

# Technology Stack & Development Guidelines

## Core Stack

| Layer | Technology | Version/Notes |
|-------|-----------|---------------|
| **Runtime** | Node.js + TypeScript | ES2021 target, strict mode |
| **Framework** | NestJS 11 | Decorators, DI, modular architecture |
| **HTTP Server** | Express | Underlying platform |
| **Database** | PostgreSQL | Primary production database |
| **ORM** | Prisma 7 | Type-safe client with `@prisma/adapter-pg` |
| **Queue** | Bull (BullMQ) | Redis-based async job processing |
| **Testing** | Jest + Supertest | Unit, integration, E2E tests |

## Package Manager

**CRITICAL**: This project uses **pnpm** exclusively.

- Use `pnpm install` for dependencies
- Use `pnpm dlx` for one-off package execution
- Use `pnpm exec` for local binaries
- Never use `npm` or `yarn` commands

## Key Dependencies

### Infrastructure
- **AWS SDK**: S3 (file storage), SNS (SMS notifications)
- **Stripe**: Payment processing and subscription webhooks
- **Redis**: Bull queue backend, caching layer

### AI & Analysis
- **Vercel AI SDK**: Unified AI interface
- **Azure OpenAI**: Brand analysis and AI features
- **OpenAI SDK**: Alternative AI provider

### Authentication & Security
- **jsonwebtoken**: JWT token generation/validation
- **PBKDF2 SHA-512**: Password hashing (custom implementation)
- Custom NestJS guards: `AdminJwtGuard`, `UserJwtGuard`

### Validation & Transformation
- **class-validator**: DTO validation with decorators
- **class-transformer**: Object transformation and serialization
- **Zod**: Domain-level validation rules

### File Processing
- **csv-parser**: CSV file parsing
- **xml2js**: XML parsing for journal data
- **archiver/unzipper**: ZIP file handling

### Documentation
- **@nestjs/swagger**: OpenAPI/Swagger documentation
- Auto-generated API docs at `/api/docs`

## Development Commands

### Server Management
```bash
pnpm start:dev             # Hot reload development server
pnpm start:debug           # Debug mode with inspector
pnpm build                 # Production build
pnpm start:prod            # Run production build
```

### Database Operations
```bash
pnpm exec prisma generate        # Generate Prisma client after schema changes
pnpm exec prisma migrate dev     # Create and apply migration
pnpm exec prisma migrate deploy  # Apply migrations in production
pnpm exec prisma db push         # Push schema without migration (dev only)
pnpm exec prisma db seed         # Run seed scripts
pnpm exec prisma studio          # Open Prisma Studio GUI
```

### Code Quality
```bash
pnpm lint                  # ESLint with auto-fix
pnpm format                # Prettier formatting (if enabled)
pnpm test                  # Run unit tests
pnpm test:watch            # Run tests in watch mode
pnpm test:e2e              # Run end-to-end tests
pnpm test:cov              # Generate coverage report
```

## Architecture Patterns

### Modular Bounded Contexts
- Each `zarp-*` module is a self-contained bounded context
- Modules communicate via exported services, not internal classes
- Shared infrastructure in `shared/` with `@Global()` decorator

### Repository Pattern
- Domain interfaces define contracts in `domain/interfaces/`
- Prisma implementations in `infrastructure/repositories/`
- Dependency injection via Symbol tokens

### Authentication Strategy
- JWT-based with separate admin and user guards
- Session management for admin users
- Multi-tenant isolation enforced at guard level

### Background Processing
- Bull queues for async operations (email campaigns, journal processing)
- Processors in `infrastructure/processors/`
- Redis required for queue backend

### API Versioning
- **v1**: Legacy endpoints (maintenance mode, no new features)
- **v2**: Current DDD-based modular architecture
- Route prefixes: `/api/v1/*` and `/api/*` (v2 default)

## Database Conventions

### Prisma Schema
- Location: `prisma/schema.prisma`
- Generated client: `src/generated/prisma/`
- All columns use `snake_case`
- Timestamps: `created_at`, `updated_at` (auto-managed)

### Migration Strategy
- Always use migrations for schema changes (never `db push` in production)
- Migration naming: `[timestamp]_[descriptive_name]`
- Archived migrations in `prisma/archived/migrations/`

### Seeding
- Organized by bounded context in `prisma/seeds/`
- Shared seeds (plans, tokens) in `prisma/seeds/shared/`
- Run with `pnpm exec prisma db seed`

## Testing Strategy

### Test Pyramid
- **Many unit tests**: Domain entities, value objects, use cases (no DB)
- **Some integration tests**: Repositories with test database
- **Few E2E tests**: Critical user flows only

### Test Utilities
- In-memory repository fakes in `shared/testing/in-memory-repos/`
- Use fakes for TDD, mocks for specific scenarios
- Test database separate from development database

### Test Naming
- Unit tests: `*.spec.ts` next to source file
- E2E tests: `*.e2e-spec.ts` in `test/` directory
- Integration tests: `*.spec.ts` in `infrastructure/repositories/`

## Environment Configuration

### Required Variables
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT signing
- `REDIS_URL`: Redis connection for Bull queues
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`: AWS services
- `STRIPE_SECRET_KEY`: Stripe API key
- `AZURE_OPENAI_API_KEY`: AI features

### Optional Variables
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `SMTP_*`: Email configuration per tenant

## Code Style Enforcement

### ESLint Configuration
- TypeScript-specific rules enabled
- NestJS plugin for decorator validation
- Strict mode enforced
- Auto-fix on save recommended

### Prettier Status
- Currently disabled via `.prettierignore`
- Manual formatting preferred
- Consistent indentation: 2 spaces

## Common Pitfalls

### DO NOT
- Use `npm` or `yarn` (use `pnpm` only)
- Put NestJS decorators in domain layer
- Import Prisma types in domain layer
- Use `any` type (strict mode enforced)
- Modify ShadCN UI primitives directly
- Run long-running commands without `controlPwshProcess`

### DO
- Use `pnpm` for all package operations
- Keep domain layer pure TypeScript
- Map Prisma types to domain entities in repositories
- Define explicit TypeScript interfaces
- Inject dependencies via interface tokens
- Use `getDiagnostics` for code validation

## Performance Considerations

### Database
- Use Prisma's connection pooling
- Index frequently queried columns
- Batch operations where possible
- Use transactions for multi-step operations

### Caching
- Redis for session storage
- Bull queue results caching
- Consider response caching for expensive operations

### Background Jobs
- Use Bull queues for heavy processing
- Set appropriate concurrency limits
- Implement retry logic with exponential backoff

## Documentation Access

Use Context7 MCP for library documentation:
- NestJS: docs.nestjs.com
- Prisma: prisma.io/docs
- Bull: docs.bullmq.io
- Stripe: stripe.com/docs/api
- AWS SDK: docs.aws.amazon.com/sdk-for-javascript