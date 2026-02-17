# Data Model: Lead Collections per Tenant

**Branch**: `002-lead-collections` | **Date**: 2026-02-16

## Entity Relationship Overview

```
Tenant (1) ──── (*) LeadCollection (1) ──── (*) Lead
```

- A **Tenant** has many **LeadCollections**.
- A **LeadCollection** has many **Leads**.
- A **Lead** optionally belongs to one **LeadCollection** (backward compatibility).

## New Model: LeadCollection

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Int | PK, auto-increment | Primary key |
| `name` | String | VarChar(150), required | Human-friendly collection name |
| `slug` | String | VarChar(100), required | URL-safe identifier for capture endpoint |
| `source` | String | VarChar(100), required | Descriptive label of the lead source (e.g., "landing-page-home") |
| `access_mode` | EAccessMode | Enum, required, default: `public` | Security posture of the capture endpoint |
| `allowed_domains` | String[] | Array of strings, optional | Whitelisted CORS origins for `private` mode |
| `secret_key_hash` | String | Optional | SHA-256 hash of the secret key (for `restricted` mode) |
| `secret_key_salt` | String | Optional | Salt used for secret key hashing |
| `active` | Boolean | Default: true | Whether the collection accepts new leads |
| `tenant_id` | Int | FK -> Tenant.id, required | Owning tenant |
| `created_at` | DateTime | Default: now() | Creation timestamp |
| `updated_at` | DateTime | Auto-updated | Last modification timestamp |

**Indexes**:
- `@@unique([slug, tenant_id])` -- Slugs are unique within a tenant
- `@@index([tenant_id])` -- Fast lookup by tenant

**Relations**:
- `Tenant` -> `LeadCollection[]` (one-to-many)
- `LeadCollection` -> `Lead[]` (one-to-many)

### Prisma Schema

```prisma
enum ECollectionAccessMode {
  public
  private
  restricted
}

model LeadCollection {
  id              Int                    @id @default(autoincrement())
  name            String                 @db.VarChar(150)
  slug            String                 @db.VarChar(100)
  source          String                 @db.VarChar(100)
  access_mode     ECollectionAccessMode  @default(public)
  allowed_domains String[]               @default([])
  secret_key_hash String?
  secret_key_salt String?
  active          Boolean                @default(true)
  tenant_id       Int
  created_at      DateTime               @default(now())
  updated_at      DateTime               @updatedAt
  Tenant          Tenant                 @relation(fields: [tenant_id], references: [id])
  Lead            Lead[]

  @@unique([slug, tenant_id])
  @@index([tenant_id])
}
```

## Modified Model: Lead

Add an optional foreign key to `LeadCollection`.

| Field | Type | Change | Description |
|-------|------|--------|-------------|
| `collection_id` | Int? | NEW, optional FK -> LeadCollection.id | Collection this lead was captured through |

### Prisma Schema Changes

```prisma
model Lead {
  id              Int              @id @default(autoincrement())
  name            String?          @db.VarChar(255)
  email           String?
  phone_number    String?          @db.VarChar(14)
  origin          Int?             @db.SmallInt
  origin_font     String?          @db.VarChar(50)
  description     String?
  data            Json?
  status          Int?             @default(1) @db.SmallInt
  collection_id   Int?                                          // NEW
  created_at      DateTime         @default(now())
  updated_at      DateTime         @updatedAt
  LeadCollection  LeadCollection?  @relation(fields: [collection_id], references: [id])  // NEW
}
```

## Modified Model: Tenant

Add the reverse relation to `LeadCollection`.

```prisma
model Tenant {
  id              Int              @id @default(autoincrement())
  name            String           @db.VarChar(100)
  slug            String           @unique @db.VarChar(50)
  domain          String?          @db.VarChar(255)
  active          Boolean          @default(true)
  created_at      DateTime         @default(now())
  updated_at      DateTime         @updatedAt
  AdminTenant     AdminTenant[]
  Blog            Blog[]
  LeadCollection  LeadCollection[]   // NEW
}
```

## New Enum: ECollectionAccessMode

Defined in Prisma schema (above) and mirrored as a domain enum.

| Value | Description |
|-------|-------------|
| `public` | No authentication or CORS restrictions on capture endpoint |
| `private` | CORS enforcement with configurable allowed domains list |
| `restricted` | Secret key validation via `x-collection-key` header |

## Domain Entities

### LeadCollection Entity (Pure TypeScript)

```
LeadCollection
├── id: number (optional, assigned by DB)
├── name: string
├── slug: string
├── source: string
├── accessMode: EAccessMode (public | private | restricted)
├── allowedDomains: string[] (empty for non-private modes)
├── active: boolean
├── tenantId: number
├── createdAt: Date (optional)
├── updatedAt: Date (optional)
└── Methods:
    ├── isPublic(): boolean
    ├── isPrivate(): boolean
    ├── isRestricted(): boolean
    └── isActive(): boolean
```

Note: `secret_key_hash` and `secret_key_salt` are NOT part of the domain entity. They are infrastructure concerns handled by the repository and guard layers.

### Lead Entity (Modified)

```
Lead (existing, extended)
├── ... existing fields ...
├── collectionId: number (optional, NEW)
```

## Domain Errors

| Error Class | Thrown When |
|-------------|------------|
| `CollectionNotFoundError` | Collection not found by ID or slug |
| `CollectionSlugConflictError` | Slug already exists for the same tenant |
| `CollectionInactiveError` | Lead submission to an inactive collection |
| `InvalidCollectionKeyError` | Invalid or missing `x-collection-key` for restricted collections |

## State Transitions

LeadCollection has a simple binary state:

```
Active ──(deactivate)──> Inactive
Inactive ──(reactivate)──> Active
```

When **Active**: Capture endpoint accepts leads.
When **Inactive**: Capture endpoint rejects leads with `CollectionInactiveError`.

## Validation Rules

### LeadCollection Creation
- `name`: Required, max 150 chars
- `source`: Required, max 100 chars
- `access_mode`: Required, must be one of `public`, `private`, `restricted`
- `allowed_domains`: Required when `access_mode` is `private`; array of valid domain strings
- `tenant_id`: Required (from auth context, not user input for tenant admins; from body/param for super admins)

### Lead Capture (via collection endpoint)
- At least one of `name`, `email`, or `phone_number` must be provided
- `email` must be a valid email format if provided
- `phone_number` must be a valid phone format if provided
- `data` is optional freeform JSON
