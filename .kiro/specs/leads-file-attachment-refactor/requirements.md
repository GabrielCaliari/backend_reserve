# Leads Module File Attachment & SRP Refactor - Requirements

## 1. Overview

The current leads module lacks file attachment capabilities and proper SRP separation. This spec addresses:
- Adding file attachment support for leads (e.g., CVs from career pages)
- Improving collection metadata and source tracking
- Refactoring to follow SRP principles
- Consolidating duplicate Lead entities

## 2. User Stories

### 2.1 File Attachment Support
**As a** system administrator  
**I want to** attach files (CVs, documents) to leads  
**So that** I can store candidate resumes from career page submissions

**Acceptance Criteria:**
- Leads can have multiple file attachments
- Files are stored via the existing CMS storage system
- File metadata (name, size, type, URL) is tracked
- Files can be retrieved and deleted with leads

### 2.2 Enhanced Collection Sources
**As a** marketing manager  
**I want to** track detailed source information for lead collections  
**So that** I can analyze which channels generate the most leads

**Acceptance Criteria:**
- Collections support rich source metadata (channel, campaign, medium)
- Source information is preserved when leads are created
- Collections can be filtered by source type

### 2.3 SRP Refactoring
**As a** developer  
**I want** the leads module to follow SRP principles  
**So that** the code is maintainable and testable

**Acceptance Criteria:**
- Lead entity contains only domain logic
- Repository handles only data access
- Services orchestrate use cases without mixing concerns
- Duplicate Lead entity in reserve-auth is removed

## 3. Functional Requirements

### 3.1 Database Schema Changes

#### 3.1.1 LeadAttachment Table
```prisma
model LeadAttachment {
  id         Int      @id @default(autoincrement())
  lead_id    Int
  file_id    Int      // Reference to CMS File
  label      String?  @db.VarChar(100)  // e.g., "CV", "Cover Letter"
  created_at DateTime @default(now())
  
  Lead       Lead     @relation(fields: [lead_id], references: [id], onDelete: Cascade)
  File       File     @relation(fields: [file_id], references: [id])
  
  @@index([lead_id])
  @@index([file_id])
}
```

#### 3.1.2 Enhanced LeadCollection
```prisma
model LeadCollection {
  // ... existing fields ...
  source_type    String?  @db.VarChar(50)   // e.g., "career_page", "landing_page", "form"
  source_channel String?  @db.VarChar(50)   // e.g., "organic", "paid", "referral"
  source_campaign String? @db.VarChar(100)  // Campaign identifier
  metadata       Json?                       // Additional flexible metadata
}
```

### 3.2 Domain Layer

#### 3.2.1 Lead Entity Refactoring
- Remove duplicate Lead entity from `reserve-auth`
- Keep single Lead entity in `reserve-leads/domain/entities/`
- Add attachment relationship tracking
- Add domain methods for validation

#### 3.2.2 LeadAttachment Value Object
```typescript
class LeadAttachment {
  constructor(
    public readonly fileId: number,
    public readonly label?: string
  ) {}
}
```

#### 3.2.3 CollectionSource Value Object
```typescript
class CollectionSource {
  constructor(
    public readonly type: string,      // career_page, landing_page, etc.
    public readonly channel?: string,  // organic, paid, referral
    public readonly campaign?: string  // campaign identifier
  ) {}
}
```

### 3.3 Application Layer

#### 3.3.1 Use Cases (New Pattern)
Create focused use cases instead of fat services:
- `CreateLeadWithAttachments` - Create lead with file uploads
- `AttachFileToLead` - Add file to existing lead
- `RemoveLeadAttachment` - Remove file from lead
- `FindLeadsByCollection` - Query leads with filters
- `CreateLeadCollection` - Create collection with source metadata

#### 3.3.2 DTOs
```typescript
class CreateLeadWithAttachmentsDto {
  name?: string;
  email?: string;
  phone_number?: string;
  origin: EOriginLead;
  collection_id?: number;
  attachments?: Array<{
    file_id: number;
    label?: string;
  }>;
  data?: any;
}

class CreateCollectionDto {
  name: string;
  source: string;
  source_type?: string;
  source_channel?: string;
  source_campaign?: string;
  access_mode: EAccessMode;
  allowed_domains?: string[];
  metadata?: any;
}
```

### 3.4 Infrastructure Layer

#### 3.4.1 Repository Interfaces
```typescript
interface ILeadAttachmentRepository {
  create(leadId: number, attachment: LeadAttachment): Promise<void>;
  findByLeadId(leadId: number): Promise<LeadAttachment[]>;
  delete(id: number): Promise<void>;
  deleteByLeadId(leadId: number): Promise<void>;
}
```

#### 3.4.2 Controller Endpoints
- `POST /api/leads` - Create lead with optional file attachments
- `POST /api/leads/:id/attachments` - Add attachment to existing lead
- `DELETE /api/leads/:id/attachments/:attachmentId` - Remove attachment
- `GET /api/leads/:id/attachments` - List lead attachments

## 4. Non-Functional Requirements

### 4.1 Performance
- File uploads should not block lead creation
- Attachment queries should be optimized with proper indexes

### 4.2 Security
- File uploads must validate file types and sizes
- Only authorized users can access lead attachments
- Collection secret keys remain secure

### 4.3 Maintainability
- Follow SRP: one class, one responsibility
- Use dependency injection throughout
- Maintain clear layer boundaries (Domain → Application → Infrastructure)

## 5. Technical Constraints

### 5.1 Existing Systems
- Must integrate with existing CMS storage system
- Must maintain backward compatibility with existing leads
- Must not break existing collection functionality

### 5.2 Testing
- Unit tests for domain entities and value objects
- Integration tests for repositories
- Minimal E2E tests for critical flows only

## 6. Out of Scope

- Lead deduplication logic
- Advanced lead scoring
- Email campaign integration (handled by reserve-mailer)
- Lead qualification AI (handled by separate module)

## 7. Success Metrics

- All existing lead functionality continues to work
- New file attachment endpoints are functional
- Code follows SRP with clear separation of concerns
- Test coverage for new functionality
- No performance degradation
