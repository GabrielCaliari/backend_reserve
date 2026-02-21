# Leads Module File Attachment & SRP Refactor - Design

## 1. Architecture Overview

This design follows Clean Architecture with DDD principles:
- **Domain Layer**: Pure TypeScript entities, value objects, interfaces
- **Application Layer**: Use cases (one operation per class), DTOs
- **Infrastructure Layer**: Repositories, controllers, guards

## 2. Database Schema Design

### 2.1 New Tables

#### LeadAttachment
```prisma
model LeadAttachment {
  id         Int      @id @default(autoincrement())
  lead_id    Int
  file_id    Int
  label      String?  @db.VarChar(100)
  created_at DateTime @default(now())
  
  Lead       Lead     @relation(fields: [lead_id], references: [id], onDelete: Cascade)
  File       File     @relation(fields: [file_id], references: [id])
  
  @@index([lead_id])
  @@index([file_id])
}
```

### 2.2 Modified Tables

#### LeadCollection (add source metadata)
```prisma
model LeadCollection {
  // ... existing fields ...
  source_type     String?  @db.VarChar(50)
  source_channel  String?  @db.VarChar(50)
  source_campaign String?  @db.VarChar(100)
  metadata        Json?
}
```

#### Lead (add attachment relation)
```prisma
model Lead {
  // ... existing fields ...
  LeadAttachment LeadAttachment[]
}
```

## 3. Domain Layer Design

### 3.1 Entities

**Lead Entity** (`domain/entities/lead.entity.ts`)
- Consolidate into single entity (remove from zarp-auth)
- Add attachment tracking
- Keep domain logic pure (no NestJS decorators)

**LeadCollection Entity** (`domain/entities/lead-collection.entity.ts`)
- Add source metadata fields
- Add validation methods for source data

### 3.2 Value Objects

**CollectionSource** (`domain/value-objects/collection-source.vo.ts`)
```typescript
export class CollectionSource {
  constructor(
    public readonly type: string,
    public readonly channel?: string,
    public readonly campaign?: string
  ) {
    if (!type || type.trim().length === 0) {
      throw new Error('Source type is required');
    }
  }
  
  toString(): string {
    return `${this.type}${this.channel ? `/${this.channel}` : ''}`;
  }
}
```

### 3.3 Repository Interfaces

**ILeadAttachmentRepository** (`domain/interfaces/lead-attachment.repository.interface.ts`)
```typescript
export const LEAD_ATTACHMENT_REPOSITORY = Symbol('LEAD_ATTACHMENT_REPOSITORY');

export interface ILeadAttachmentRepository {
  create(leadId: number, fileId: number, label?: string): Promise<void>;
  findByLeadId(leadId: number): Promise<Array<{ id: number; fileId: number; label?: string }>>;
  delete(id: number): Promise<void>;
  deleteByLeadId(leadId: number): Promise<void>;
}
```

## 4. Application Layer Design

### 4.1 Use Cases (SRP Pattern)

**CreateLeadWithAttachments** (`application/use-cases/create-lead-with-attachments.use-case.ts`)
- Single responsibility: Create lead and attach files
- Inject: ILeadRepository, ILeadAttachmentRepository
- Returns: ServiceResponse<{ id: number }>

**AttachFileToLead** (`application/use-cases/attach-file-to-lead.use-case.ts`)
- Single responsibility: Add file to existing lead
- Inject: ILeadRepository, ILeadAttachmentRepository
- Validates lead exists before attaching

**RemoveLeadAttachment** (`application/use-cases/remove-lead-attachment.use-case.ts`)
- Single responsibility: Remove attachment from lead
- Inject: ILeadAttachmentRepository
- Does not delete the file itself (CMS handles that)

**FindLeadsByCollection** (`application/use-cases/find-leads-by-collection.use-case.ts`)
- Single responsibility: Query leads with filters
- Inject: ILeadRepository
- Supports pagination

### 4.2 DTOs

**CreateLeadWithAttachmentsDto**
```typescript
export class CreateLeadWithAttachmentsDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone_number?: string;

  @IsEnum(EOriginLead)
  origin: EOriginLead;

  @IsOptional()
  @IsNumber()
  collection_id?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @IsOptional()
  data?: any;
}

export class AttachmentDto {
  @IsNumber()
  file_id: number;

  @IsOptional()
  @IsString()
  label?: string;
}
```

**UpdateCollectionDto**
```typescript
export class UpdateCollectionDto {
  @IsOptional()
  @IsString()
  source_type?: string;

  @IsOptional()
  @IsString()
  source_channel?: string;

  @IsOptional()
  @IsString()
  source_campaign?: string;

  @IsOptional()
  metadata?: any;
}
```

## 5. Infrastructure Layer Design

### 5.1 Repositories

**PrismaLeadAttachmentRepository** (`infrastructure/repositories/lead-attachment.repository.ts`)
- Implements ILeadAttachmentRepository
- Uses PrismaService for data access
- Maps Prisma types to domain types

### 5.2 Controllers

**LeadController** (update existing)
- `POST /api/leads` - Create lead with attachments
- `POST /api/leads/:id/attachments` - Add attachment
- `DELETE /api/leads/:id/attachments/:attachmentId` - Remove attachment
- `GET /api/leads/:id/attachments` - List attachments

**LeadCollectionController** (update existing)
- Update endpoints to support new source metadata

### 5.3 Module Wiring

Update `zarp-leads.module.ts`:
```typescript
@Module({
  imports: [ZarpCmsModule], // For file access
  providers: [
    // Repositories
    {
      provide: LEAD_REPOSITORY,
      useClass: PrismaLeadRepository,
    },
    {
      provide: LEAD_ATTACHMENT_REPOSITORY,
      useClass: PrismaLeadAttachmentRepository,
    },
    {
      provide: LEAD_COLLECTION_REPOSITORY,
      useClass: LeadCollectionRepository,
    },
    // Use Cases
    CreateLeadWithAttachmentsUseCase,
    AttachFileToLeadUseCase,
    RemoveLeadAttachmentUseCase,
    FindLeadsByCollectionUseCase,
    // Legacy service (keep for backward compatibility)
    LeadService,
    LeadCollectionService,
  ],
  controllers: [
    LeadController,
    LeadCollectionController,
    LeadCaptureController,
  ],
  exports: [
    CreateLeadWithAttachmentsUseCase,
    LeadService, // For backward compatibility
  ],
})
export class ZarpLeadsModule {}
```

## 6. Migration Strategy

### 6.1 Phase 1: Database Migration
1. Create LeadAttachment table
2. Add source metadata columns to LeadCollection
3. Run migration without data loss

### 6.2 Phase 2: Code Refactoring
1. Remove duplicate Lead entity from zarp-auth
2. Update imports across codebase
3. Create new use cases
4. Update repositories

### 6.3 Phase 3: Controller Updates
1. Add new endpoints for attachments
2. Update existing endpoints to support new fields
3. Maintain backward compatibility

## 7. Testing Strategy

### 7.1 Unit Tests (Priority)
- Domain entities validation logic
- Use cases with mocked repositories
- Value objects

### 7.2 Integration Tests (Minimal)
- Repository implementations with test database
- File attachment flow

### 7.3 E2E Tests (Critical Paths Only)
- Create lead with attachment
- Remove attachment

## 8. Backward Compatibility

- Existing lead creation without attachments continues to work
- Existing collection endpoints remain functional
- Legacy LeadService methods are preserved
- New use cases are additive, not replacing

## 9. Security Considerations

- File uploads validated by CMS module
- Collection secret keys remain secure
- Attachment access controlled by lead ownership
- Tenant isolation maintained

## 10. Performance Considerations

- Indexes on lead_id and file_id in LeadAttachment
- Lazy loading of attachments (not fetched by default)
- Pagination for lead queries
- Efficient cascade deletes

## 11. Error Handling

Domain errors:
- `LeadNotFoundError`
- `AttachmentNotFoundError`
- `InvalidSourceError`

Application layer catches and converts to ServiceResponse:
```typescript
{
  status: 404,
  data: { code: 'LEAD_NOT_FOUND', message: 'Lead not found' }
}
```

## 12. API Documentation

All endpoints documented with Swagger:
- `@ApiTags('Leads')`
- `@ApiOperation()` for each endpoint
- `@ApiResponse()` for status codes
- `@ApiConsumes('multipart/form-data')` for file uploads
