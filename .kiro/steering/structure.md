# Project Structure

## Root Directory
- `src/` - Main application source code
- `prisma/` - Database schema, migrations, and seeds
- `script/` - Utility scripts for data processing and analysis
- `test/` - End-to-end tests
- `docs/` - Project documentation
- `temp/` - Temporary files (uploads, processing)
- `dist/` - Compiled TypeScript output

## Source Code Organization (`src/`)

### Core Architecture
- `main.ts` - Application entry point with CORS and validation setup
- `app.module.ts` - Root module with all imports and providers
- `app.controller.ts` - Root controller

### Directory Structure
```
src/
├── @types/           # TypeScript type definitions
├── common/           # Shared utilities
│   ├── guards/       # Authentication guards
│   ├── interfaces/   # Common interfaces
│   ├── pipe/         # Custom pipes (validation, transformation)
│   └── validators/   # Custom validation logic
├── core/             # Core business logic
│   ├── classes/      # Utility classes
│   ├── database/     # Repository pattern implementations
│   ├── exceptions/   # Custom exception classes
│   ├── prisma/       # Prisma client configuration
│   ├── providers/    # External service providers
│   └── functions.ts  # Utility functions
└── modules/          # Feature modules
    ├── v1/           # API version 1
    └── v2/           # API version 2
```

## Module Organization
- Each feature has its own module directory with:
  - `*.controller.ts` - HTTP endpoints
  - `*.service.ts` - Business logic
  - `*.module.ts` - Module configuration (v2 only)

## Database Layer (`src/core/database/`)
- Repository pattern for all database operations
- Separate repository files for each entity
- Prisma client integration in `src/core/prisma/`

## API Versioning
- **v1**: Legacy API with direct controller/service structure
- **v2**: Modular architecture with proper NestJS modules
- Router configuration in `app.module.ts` for v2 routing

## Scripts Directory
- `script/` contains data processing utilities:
  - CNPJ data processing and analysis
  - CSV to JSON conversion
  - Database seeding scripts
  - Worker processes for background tasks

## Naming Conventions
- Controllers: `*.controller.ts`
- Services: `*.service.ts` 
- Repositories: `*.repository.ts`
- Guards: `*-guard.guard.ts`
- Pipes: `*-pipe.pipe.ts`
- Types: `@*.ts` (prefixed with @)

## Key Patterns
- Repository pattern for database access
- Guard-based authentication
- Pipe-based request transformation
- Modular architecture (v2)
- Dependency injection throughout