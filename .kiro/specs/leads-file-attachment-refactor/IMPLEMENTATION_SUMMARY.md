# Leads Module File Attachment & SRP Refactor - Implementation Summary

## What Was Implemented

### 1. Database Schema Changes ✅
- Added `LeadAttachment` table linking leads to media assets
- Added source metadata columns to `LeadCollection` (source_type, source_channel, source_campaign, metadata)
- Created and ran migration successfully

### 2. Domain Layer ✅
- Created `CollectionSource` value object for structured source tracking
- Updated `LeadCollection` entity with source metadata methods
- Removed duplicate `Lead` entity from `zarp-auth` module
- Created `ILeadAttachmentRepository` interface
- Created domain errors: `AttachmentNotFoundError`, `InvalidSourceError`

### 3. Infrastructure Layer ✅
- Implemented `PrismaLeadAttachmentRepository` for attachment data access
- Updated `LeadCollectionRepository` to support source metadata
- Updated `LeadController` with new attachment endpoints

### 4. Application Layer (Use Cases - SRP Pattern) ✅
- `CreateLeadWithAttachmentsUseCase` - Create lead with optional file attachments
- `AttachFileToLeadUseCase` - Add file to existing lead
- `RemoveLeadAttachmentUseCase` - Remove attachment from lead
- Created DTOs: `CreateLeadWithAttachmentsDto`, `AttachmentDto`
- Updated `CreateCollectionDto` and `UpdateCollectionDto` with source metadata

### 5. API Endpoints ✅
- `POST /api/leads` - Create lead with optional attachments (public)
- `GET /api/leads/:id/attachments` - List lead attachments (admin)
- `POST /api/leads/:id/attachments` - Add attachment to lead (admin)
- `DELETE /api/leads/:id/attachments/:attachmentId` - Remove attachment (admin)
- All endpoints documented with Swagger

### 6. Module Wiring ✅
- Registered all repositories with DI tokens
- Registered use cases in module
- Exported necessary providers for cross-module usage
- Maintained backward compatibility with existing services

## Key Improvements

### SRP (Single Responsibility Principle)
- **Before**: Fat `LeadService` with multiple responsibilities
- **After**: Focused use cases, each handling one operation
  - Each use case has a single, clear purpose
  - Easy to test in isolation
  - Clear separation of concerns

### File Attachment Support
- **Before**: No way to attach files to leads
- **After**: Full support for attaching CVs, documents, etc.
  - Integrates with existing CMS MediaAsset system
  - Multiple attachments per lead
  - Labeled attachments (e.g., "CV", "Cover Letter")

### Enhanced Collection Metadata
- **Before**: Basic source string only
- **After**: Rich source tracking
  - Source type (career_page, landing_page, etc.)
  - Source channel (organic, paid, referral)
  - Source campaign identifier
  - Flexible JSON metadata field

### Code Organization
- **Before**: Duplicate Lead entity in two modules
- **After**: Single source of truth in `zarp-leads`
  - Cleaner imports
  - Easier maintenance
  - No confusion about which entity to use

## Backward Compatibility

All existing functionality preserved:
- ✅ Existing lead creation without attachments works
- ✅ Existing collection endpoints functional
- ✅ Legacy `LeadService` methods preserved
- ✅ No breaking changes to existing APIs

## Usage Examples

### Create Lead with CV Attachment
```typescript
POST /api/leads
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone_number": "11999999999",
  "origin": 6,
  "origin_font": "Career Page",
  "description": "Senior Developer applicant",
  "collection_id": 1,
  "data": { "position": "Senior Developer" },
  "attachments": [
    {
      "asset_id": 123,
      "label": "CV"
    },
    {
      "asset_id": 124,
      "label": "Cover Letter"
    }
  ]
}
```

### Create Collection with Source Metadata
```typescript
POST /api/collections
{
  "name": "Career Applications 2026",
  "source": "career-page",
  "source_type": "career_page",
  "source_channel": "organic",
  "source_campaign": "hiring-q1-2026",
  "access_mode": "public",
  "metadata": {
    "department": "Engineering",
    "positions": ["Senior Dev", "Junior Dev"]
  }
}
```

## Architecture Benefits

1. **Testability**: Use cases are easy to unit test with mocked repositories
2. **Maintainability**: Clear separation makes code easier to understand and modify
3. **Extensibility**: Easy to add new use cases without touching existing code
4. **Type Safety**: Full TypeScript support with Prisma-generated types
5. **Documentation**: All endpoints documented with Swagger/OpenAPI

## Next Steps (Optional Enhancements)

- Add bulk attachment operations
- Implement attachment file type validation
- Add attachment size limits
- Create analytics for source tracking
- Add lead deduplication based on email/phone
