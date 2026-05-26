# Quickstart: Lead Collections per Tenant

**Branch**: `002-lead-collections` | **Date**: 2026-02-16

## Overview

This feature extends the `reserve-leads` bounded context with **LeadCollections** -- tenant-scoped containers for organizing lead capture. Each collection has a configurable access mode (public, private/CORS, restricted/auth) and exposes a dynamic capture endpoint.

## Prerequisites

- PostgreSQL running with current schema
- `pnpm install` completed
- Environment variables configured (`.env`)
- Prisma client generated (`pnpm prisma generate`)

## Implementation Order

### Phase 1: Schema & Domain Foundation

1. **Update Prisma schema** (`prisma/schema.prisma`)
   - Add `ECollectionAccessMode` enum
   - Add `LeadCollection` model with tenant relation
   - Add `collection_id` optional FK on `Lead` model
   - Add `LeadCollection[]` relation on `Tenant` model

2. **Run migration**
   ```powershell
   pnpm prisma migrate dev --name add-lead-collections
   ```

3. **Create domain layer** (`src/modules/reserve-leads/domain/`)
   - `entities/lead-collection.entity.ts` -- Pure TS entity
   - `enums/access-mode.enum.ts` -- EAccessMode enum
   - `errors/collection-not-found.error.ts`
   - `errors/collection-slug-conflict.error.ts`
   - `errors/collection-inactive.error.ts`
   - `errors/invalid-collection-key.error.ts`
   - `interfaces/lead-collection.repository.interface.ts` -- ILeadCollectionRepository + Symbol token

4. **Update Lead entity** -- Add optional `collectionId` field

### Phase 2: Collection CRUD (Admin)

1. **Create repository** (`infrastructure/repositories/lead-collection.repository.ts`)
   - Implements `ILeadCollectionRepository`
   - Prisma-based CRUD with tenant scoping

2. **Create service** (`application/services/lead-collection.service.ts`)
   - Collection creation with slug generation + secret key generation for restricted mode
   - Listing with tenant scope (or all tenants for super admin)
   - Update with access mode transitions
   - Key regeneration

3. **Create DTOs** (`application/dtos/`)
   - `create-collection.dto.ts`
   - `update-collection.dto.ts`

4. **Create controller** (`infrastructure/controllers/lead-collection.controller.ts`)
   - `POST /collections` (manager+)
   - `GET /collections` (viewer+)
   - `GET /collections/:id` (viewer+)
   - `PUT /collections/:id` (manager+)
   - `POST /collections/:id/regenerate-key` (manager+)

5. **Update module** (`reserve-leads.module.ts`)
   - Register new providers, controllers, DI tokens

### Phase 3: Lead Capture Endpoint

1. **Create capture controller** (`infrastructure/controllers/lead-capture.controller.ts`)
   - `POST /collect/:slug` -- Dynamic capture endpoint
   - Resolves collection by slug
   - Validates access mode
   - Creates lead with collection context

2. **Create collection secret key guard** (`infrastructure/guards/collection-secret-key.guard.ts`)
   - Follows `BlogSecretKeyGuard` pattern
   - Validates `x-collection-key` header

3. **Update lead service/repository**
   - Support `collection_id` on lead creation
   - Support filtering leads by `collection_id`

### Phase 4: Collection-Scoped Lead Viewing

1. **Add collection leads endpoint** to existing controller or new route
   - `GET /collections/:id/leads` (viewer+)
   - Paginated, tenant-scoped

2. **Update existing lead listing** to support optional `collection_id` filter

## Key Patterns to Follow

### Guard Stack (Admin Routes)
```typescript
@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
@Roles(EAdminRole.manager)
```

### DI Token Registration
```typescript
// domain/interfaces/lead-collection.repository.interface.ts
export const LEAD_COLLECTION_REPOSITORY = Symbol('LEAD_COLLECTION_REPOSITORY');

// reserve-leads.module.ts
{
  provide: LEAD_COLLECTION_REPOSITORY,
  useClass: LeadCollectionRepository,
}
```

### Secret Key Generation (follows Blog pattern)
```typescript
import * as crypto from 'crypto';

const plainKey = `ck_live_${crypto.randomBytes(32).toString('hex')}`;
const hash = crypto.createHash('sha256').update(plainKey).digest('hex');
// Store hash in DB, return plainKey to admin once
```

### Slug Generation (follows CMS pattern)
```typescript
// Reuse or adapt slug.util.ts from reserve-cms
const slug = generateSlug(name);
// Check uniqueness within tenant: @@unique([slug, tenant_id])
```

## Testing Strategy

| Layer | What to Test | Tool |
|-------|-------------|------|
| Unit | LeadCollectionService (mock repo) | Jest with in-memory fake |
| Unit | Domain entity methods (isPublic, isRestricted) | Jest |
| Unit | CollectionSecretKeyGuard | Jest with mock repo |
| Integration | Controller + Service + Repository | Supertest |
| E2E | Full capture flow (public/private/restricted) | Supertest |

## API Route Table

| Method | Path | Auth | Min Role | Description |
|--------|------|------|----------|-------------|
| POST | `/leads/collections` | JWT + Tenant | manager | Create collection |
| GET | `/leads/collections` | JWT + Tenant | viewer | List collections |
| GET | `/leads/collections/:id` | JWT + Tenant | viewer | Get collection |
| PUT | `/leads/collections/:id` | JWT + Tenant | manager | Update collection |
| POST | `/leads/collections/:id/regenerate-key` | JWT + Tenant | manager | Regenerate key |
| GET | `/leads/collections/:id/leads` | JWT + Tenant | viewer | List leads by collection |
| POST | `/leads/collect/:slug` | Varies | N/A | Capture lead (public endpoint) |
