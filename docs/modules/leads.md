# Leads Module Documentation

## Overview

The Leads module provides CRM functionality for capturing and managing leads with support for file attachments and rich source tracking. It follows Clean Architecture with DDD principles and SRP (Single Responsibility Principle).

## Features

- Lead capture from multiple sources (landing pages, career pages, forms)
- File attachment support (CVs, documents, etc.)
- Lead collections with access control (public, private, restricted)
- Rich source metadata tracking (type, channel, campaign)
- Multi-tenant support
- RESTful API with Swagger documentation

## Architecture

```
zarp-leads/
├── domain/              # Pure business logic (no framework dependencies)
│   ├── entities/        # Lead, LeadCollection
│   ├── value-objects/   # CollectionSource
│   ├── interfaces/      # Repository contracts
│   ├── enums/          # EOriginLead, ELeadStatus, EAccessMode
│   └── errors/         # Domain-specific errors
├── application/        # Use cases and DTOs
│   ├── use-cases/      # CreateLeadWithAttachments, AttachFileToLead, etc.
│   ├── services/       # Legacy services (backward compatibility)
│   └── dtos/          # Request/response DTOs
└── infrastructure/     # Framework & external dependencies
    ├── controllers/    # HTTP endpoints
    ├── repositories/   # Prisma implementations
    └── guards/        # Collection access guards
```

## API Endpoints

### Public Endpoints

#### Create Lead with Attachments
```http
POST /api/leads
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone_number": "11999999999",
  "origin": 6,
  "origin_font": "Career Page",
  "description": "Senior Developer applicant",
  "collection_id": 1,
  "data": {
    "position": "Senior Developer",
    "experience_years": 5
  },
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

**Response:**
```json
{
  "status": 201,
  "data": {
    "id": 456
  }
}
```

### Admin Endpoints (Require Authentication)

#### List Leads
```http
GET /api/leads?page=1&limit=30
Authorization: Bearer <admin_token>
```

#### Get Lead Details
```http
GET /api/leads/:id
Authorization: Bearer <admin_token>
```

#### List Lead Attachments
```http
GET /api/leads/:id/attachments
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "leadId": 456,
      "assetId": 123,
      "label": "CV",
      "createdAt": "2026-02-19T00:00:00.000Z"
    }
  ]
}
```

#### Add Attachment to Lead
```http
POST /api/leads/:id/attachments
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "asset_id": 125,
  "label": "Portfolio"
}
```

#### Remove Attachment
```http
DELETE /api/leads/:id/attachments/:attachmentId
Authorization: Bearer <admin_token>
```

**Note:** This removes the attachment link but does not delete the media asset itself.

#### Update Lead Status
```http
PUT /api/leads/:id/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": 8
}
```

Status values:
- `1` - New
- `8` - Archived

## Lead Collections

Collections organize leads by source and provide access control.

### Create Collection
```http
POST /api/collections
Authorization: Bearer <admin_token>
Content-Type: application/json

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

### Access Modes

- **public**: Anyone can submit leads
- **private**: Only allowed domains can submit
- **restricted**: Requires secret key

### Source Metadata

Track where leads come from:
- **source_type**: `career_page`, `landing_page`, `contact_form`, etc.
- **source_channel**: `organic`, `paid`, `referral`, `social`
- **source_campaign**: Campaign identifier for analytics

## Lead Origins

```typescript
enum EOriginLead {
  seo_tool = 1,
  seo_archive = 2,
  email = 3,
  facebook_ads = 4,
  google_ads = 5,
  page = 6,
}
```

## File Attachments

### Workflow

1. Upload file to CMS MediaAsset system first
2. Get the `asset_id` from the upload response
3. Attach to lead using the `asset_id`

### Supported Operations

- Create lead with attachments (atomic operation)
- Add attachments to existing lead
- List all attachments for a lead
- Remove attachment (keeps the file in CMS)

### Best Practices

- Label attachments clearly ("CV", "Cover Letter", "Portfolio")
- Validate file types before upload to CMS
- Use appropriate media collection for lead attachments
- Consider file size limits

## Use Cases (Application Layer)

The module uses the Use Case pattern for SRP:

### CreateLeadWithAttachmentsUseCase
- **Purpose**: Create a lead with optional file attachments
- **Input**: `CreateLeadWithAttachmentsDto`
- **Output**: `ServiceResponse<{ id: number }>`

### AttachFileToLeadUseCase
- **Purpose**: Add a file to an existing lead
- **Input**: `leadId`, `assetId`, `label?`
- **Output**: `ServiceResponse<{ id: number }>`

### RemoveLeadAttachmentUseCase
- **Purpose**: Remove an attachment from a lead
- **Input**: `attachmentId`
- **Output**: `ServiceResponse`

## Integration Examples

### Career Page Integration

```typescript
// 1. Upload CV to CMS
const uploadResponse = await fetch('/api/media/upload', {
  method: 'POST',
  body: formData
});
const { asset_id } = await uploadResponse.json();

// 2. Create lead with CV attachment
const leadResponse = await fetch('/api/leads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: applicant.name,
    email: applicant.email,
    phone_number: applicant.phone,
    origin: 6, // page
    origin_font: 'Career Page',
    description: `Application for ${position}`,
    collection_id: careerCollectionId,
    data: {
      position,
      experience_years: applicant.experience
    },
    attachments: [
      { asset_id, label: 'CV' }
    ]
  })
});
```

### Landing Page with Source Tracking

```typescript
await fetch('/api/leads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: visitor.name,
    email: visitor.email,
    origin: 6,
    origin_font: 'Landing Page - Black Friday',
    collection_id: blackFridayCollectionId,
    data: {
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'black-friday-2026'
    }
  })
});
```

## Database Schema

### Lead Table
```sql
CREATE TABLE "Lead" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  phone_number VARCHAR(14),
  origin SMALLINT,
  origin_font VARCHAR(50),
  description TEXT,
  data JSONB,
  status SMALLINT DEFAULT 1,
  collection_id INTEGER REFERENCES "LeadCollection"(id),
  tenant_id INTEGER REFERENCES "Tenant"(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### LeadAttachment Table
```sql
CREATE TABLE "lead_attachments" (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES "Lead"(id) ON DELETE CASCADE,
  asset_id INTEGER REFERENCES "media_assets"(id),
  label VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### LeadCollection Table
```sql
CREATE TABLE "LeadCollection" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150),
  slug VARCHAR(100) UNIQUE,
  source VARCHAR(100),
  source_type VARCHAR(50),
  source_channel VARCHAR(50),
  source_campaign VARCHAR(100),
  access_mode VARCHAR(20) DEFAULT 'public',
  allowed_domains TEXT[],
  secret_key_hash VARCHAR(255),
  secret_key_salt VARCHAR(255),
  active BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  tenant_id INTEGER REFERENCES "Tenant"(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Testing

### Unit Tests
```typescript
// Test use case with mocked repository
const mockLeadRepo = {
  create: jest.fn(),
  findById: jest.fn(),
};

const mockAttachmentRepo = {
  create: jest.fn(),
};

const useCase = new CreateLeadWithAttachmentsUseCase(
  mockLeadRepo,
  mockAttachmentRepo
);

const result = await useCase.execute({
  name: 'Test',
  email: 'test@example.com',
  origin: 6,
  attachments: [{ asset_id: 1, label: 'CV' }]
});

expect(result.status).toBe(201);
expect(mockAttachmentRepo.create).toHaveBeenCalledWith(1, 1, 'CV');
```

## Migration Guide

### From Old Lead Creation
```typescript
// Before
await leadService.createLead({
  name: 'John',
  email: 'john@example.com',
  origin: 6
});

// After (still works - backward compatible)
await leadService.createLead({
  name: 'John',
  email: 'john@example.com',
  origin: 6
});

// New way with attachments
await createLeadWithAttachmentsUseCase.execute({
  name: 'John',
  email: 'john@example.com',
  origin: 6,
  attachments: [{ asset_id: 123, label: 'CV' }]
});
```

## Troubleshooting

### Common Issues

**Issue**: Attachment creation fails
- **Solution**: Verify the `asset_id` exists in `media_assets` table
- **Solution**: Check that the lead exists before adding attachment

**Issue**: Collection not accepting leads
- **Solution**: Verify collection is active (`active: true`)
- **Solution**: Check access mode and domain restrictions

**Issue**: Duplicate lead entity imports
- **Solution**: Always import from `zarp-leads/domain/entities/lead.entity`
- **Solution**: Never import from `zarp-auth` (removed)

## Performance Considerations

- Attachments are lazy-loaded (not fetched by default with lead)
- Use pagination for lead lists
- Index on `lead_id` and `asset_id` in attachments table
- Cascade deletes configured for data integrity

## Security

- File uploads validated by CMS module
- Collection secret keys hashed with salt
- Tenant isolation enforced at database level
- Admin endpoints require JWT authentication
- Public endpoints rate-limited (configure in gateway)

## Future Enhancements

- Bulk attachment operations
- Attachment file type validation
- Attachment size limits
- Lead deduplication
- Advanced analytics on source tracking
- Webhook notifications for new leads
