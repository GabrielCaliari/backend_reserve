# Leads Module File Attachment & SRP Refactor - Tasks

## 1. Database Schema Changes

- [x] 1.1 Create LeadAttachment table migration
- [x] 1.2 Add source metadata columns to LeadCollection
- [x] 1.3 Add LeadAttachment relation to Lead model
- [x] 1.4 Run migration and verify schema

## 2. Domain Layer Implementation

- [x] 2.1 Create CollectionSource value object
- [x] 2.2 Update LeadCollection entity with source methods
- [x] 2.3 Remove duplicate Lead entity from zarp-auth
- [x] 2.4 Update Lead entity imports across codebase
- [x] 2.5 Create ILeadAttachmentRepository interface
- [x] 2.6 Create domain errors (AttachmentNotFoundError, InvalidSourceError)

## 3. Infrastructure Layer - Repositories

- [x] 3.1 Create PrismaLeadAttachmentRepository
- [x] 3.2 Update LeadCollectionRepository for source metadata
- [x] 3.3 Update PrismaLeadRepository to support attachment queries

## 4. Application Layer - Use Cases

- [x] 4.1 Create CreateLeadWithAttachmentsUseCase
- [x] 4.2 Create AttachFileToLeadUseCase
- [x] 4.3 Create RemoveLeadAttachmentUseCase
- [x] 4.4 Create FindLeadsByCollectionUseCase
- [x] 4.5 Create DTOs (CreateLeadWithAttachmentsDto, AttachmentDto, UpdateCollectionDto)

## 5. Infrastructure Layer - Controllers

- [x] 5.1 Add POST /api/leads endpoint with attachment support
- [x] 5.2 Add POST /api/leads/:id/attachments endpoint
- [x] 5.3 Add DELETE /api/leads/:id/attachments/:attachmentId endpoint
- [x] 5.4 Add GET /api/leads/:id/attachments endpoint
- [x] 5.5 Update LeadCollectionController for source metadata
- [x] 5.6 Add Swagger documentation to all endpoints

## 6. Module Wiring

- [x] 6.1 Register repositories in zarp-leads.module.ts
- [x] 6.2 Register use cases in zarp-leads.module.ts
- [x] 6.3 Import ZarpCmsModule for file access
- [x] 6.4 Export use cases for other modules

## 7. Testing (Minimal - Critical Paths Only)

- [x] 7.1 Unit test: CreateLeadWithAttachmentsUseCase
- [x] 7.2 Unit test: CollectionSource value object
- [x] 7.3 Integration test: PrismaLeadAttachmentRepository
- [x] 7.4 E2E test: Create lead with attachment flow

## 8. Documentation & Cleanup

- [x] 8.1 Update module documentation
- [x] 8.2 Verify backward compatibility
- [x] 8.3 Run linter and fix issues
- [x] 8.4 Update API documentation
