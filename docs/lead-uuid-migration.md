# Lead UUID Migration

## Overview

This document describes the migration of the `Lead` table's primary key from `INT` to `UUID`, completed on February 21, 2026.

## Changes Made

### 1. Database Schema (Prisma)

#### Lead Model
- Changed `id` field from `Int @id @default(autoincrement())` to `String @id @default(uuid()) @db.Uuid`

#### LeadAttachment Model
- Changed `lead_id` field from `Int` to `String @db.Uuid`

### 2. Migration Strategy

Created a safe migration that preserves existing data:

**File**: `prisma/migrations/20260221183510_lead_uuid_migration/migration.sql`

**Steps**:
1. Add temporary UUID columns (`id_uuid`, `lead_id_uuid`)
2. Generate UUIDs for existing Lead records
3. Update LeadAttachment references with corresponding UUIDs
4. Make UUID columns NOT NULL
5. Drop foreign key constraints
6. Drop old INT columns
7. Rename UUID columns to final names
8. Add new primary key constraint
9. Recreate foreign key constraints
10. Recreate indexes

### 3. Code Updates

#### Domain Layer

**Lead Entity** (`src/modules/zarp-leads/domain/entities/lead.entity.ts`)
- Changed `id` property type from `number` to `string`

**Repository Interfaces**
- `ILeadRepository`: Updated `update()` and `findById()` to accept `string` instead of `number`
- `ILeadAttachmentRepository`: Updated all methods using `leadId` to accept `string`

**Interface Data Types**
- `LeadAttachmentData.leadId`: Changed from `number` to `string`

#### Application Layer

**Services** (`src/modules/zarp-leads/application/services/lead.service.ts`)
- `findLeadById(leadId: string)`
- `updateLeadStatus(leadId: string, status: ELeadStatus)`

**Use Cases**
- `AttachFileToLeadUseCase.execute(leadId: string, ...)`

#### Infrastructure Layer

**Repositories**
- `LeadRepository.update(lead_id: string, ...)`
- `LeadRepository.findById(lead_id: string)`
- `PrismaLeadAttachmentRepository.create(leadId: string, ...)`
- `PrismaLeadAttachmentRepository.findByLeadId(leadId: string)`
- `PrismaLeadAttachmentRepository.deleteByLeadId(leadId: string)`

**Controllers** (`src/modules/zarp-leads/infrastructure/controllers/lead.controller.ts`)
- Created `ParseUUIDPipe` for UUID validation
- Updated all endpoints to use `ParseUUIDPipe` instead of `ParseIntPipe`
- Updated API documentation to reflect UUID parameters

**New Files**
- `src/common/pipe/parse-uuid.pipe.ts`: Custom pipe for UUID validation

### 4. API Changes

All Lead-related endpoints now accept UUID instead of integer IDs:

- `GET /leads/:id` - `:id` is now a UUID
- `GET /leads/:id/attachments` - `:id` is now a UUID
- `POST /leads/:id/attachments` - `:id` is now a UUID
- `DELETE /leads/:id/attachments/:attachmentId` - `:id` is now a UUID
- `PUT /leads/:id/status` - `:id` is now a UUID

## Breaking Changes

### API Consumers

Any client consuming the Lead API must update their code to:
1. Handle UUID strings instead of integers for Lead IDs
2. Send UUID strings in path parameters
3. Store Lead IDs as strings in their databases

### Example Migration

**Before**:
```typescript
const leadId = 123;
await fetch(`/api/leads/${leadId}`);
```

**After**:
```typescript
const leadId = "550e8400-e29b-41d4-a716-446655440000";
await fetch(`/api/leads/${leadId}`);
```

## Verification

Run diagnostics to ensure no type errors:
```bash
pnpm exec tsc --noEmit
```

All diagnostics passed successfully.

## Rollback Procedure

If rollback is needed, follow these steps:

1. Restore the previous schema version
2. Create a reverse migration that converts UUIDs back to integers
3. Update all code references back to `number` types
4. Regenerate Prisma Client

**Note**: Rollback will result in data loss if new records were created with UUIDs.

## Related Tables

The following tables were NOT affected by this migration:
- `EmailLead` - Separate entity used by the mailer module
- `Delivery` - References `EmailLead`, not `Lead`

## Next Steps

Consider migrating other entities to UUID:
- `LeadCollection`
- `EmailCampaign`
- `EmailLead`
- Other domain entities as needed

## Testing Recommendations

1. Test all Lead CRUD operations
2. Test Lead attachment operations
3. Test Lead status updates
4. Verify UUID validation in API endpoints
5. Test error handling for invalid UUIDs
