import { Module } from '@nestjs/common';
import { LeadController } from './infrastructure/controllers/lead.controller';
import { LeadCollectionController } from './infrastructure/controllers/lead-collection.controller';
import { LeadCaptureController } from './infrastructure/controllers/lead-capture.controller';
import { PublicLeadController } from './infrastructure/controllers/public-lead.controller';
import { LeadService } from './application/services/lead.service';
import { LeadCollectionService } from './application/services/lead-collection.service';
import LeadRepository from './infrastructure/repositories/lead.repository';
import { LeadCollectionRepository } from './infrastructure/repositories/lead-collection.repository';
import { PrismaLeadAttachmentRepository } from './infrastructure/repositories/lead-attachment.repository';
import { CollectionSecretKeyGuard } from './infrastructure/guards/collection-secret-key.guard';
import { TenantKeyGuard } from './infrastructure/guards/tenant-key.guard';
import { LEAD_REPOSITORY, LEAD_COLLECTION_REPOSITORY, LEAD_ATTACHMENT_REPOSITORY } from './domain/interfaces';
import { ZarpAuthModule } from '../zarp-auth/zarp-auth.module';
import { CreateLeadWithAttachmentsUseCase } from './application/use-cases/create-lead-with-attachments.use-case';
import { AttachFileToLeadUseCase } from './application/use-cases/attach-file-to-lead.use-case';
import { RemoveLeadAttachmentUseCase } from './application/use-cases/remove-lead-attachment.use-case';
import { SubmitLeadUseCase } from './application/use-cases/submit-lead.use-case';
import { GeolocationProvider } from '../../shared/providers/geolocation.provider';

/**
 * Zarp Leads Module
 * Bounded context for lead management with file attachment support
 *
 * Implements:
 * - Lead CRUD operations
 * - Lead file attachments (CVs, documents)
 * - Lead listing with pagination
 * - Lead status updates
 * - Lead Collections with source metadata (Tenant-scoped)
 * - Lead Capture endpoints (public with secret key authentication)
 * - IP geolocation tracking
 *
 * Exports:
 * - LeadService and LeadRepository for cross-context consumers
 * - LeadCollectionService
 * - Use cases for lead operations
 */
@Module({
  imports: [
    ZarpAuthModule,
  ],
  controllers: [
    LeadController,
    LeadCollectionController,
    LeadCaptureController,
    PublicLeadController,
  ],
  providers: [
    // Services (legacy, for backward compatibility)
    LeadService,
    LeadCollectionService,
    
    // Repositories
    LeadRepository,
    LeadCollectionRepository,
    PrismaLeadAttachmentRepository,
    
    // Guards
    CollectionSecretKeyGuard,
    TenantKeyGuard,
    
    // Providers
    GeolocationProvider,
    
    // Use Cases (SRP pattern)
    CreateLeadWithAttachmentsUseCase,
    AttachFileToLeadUseCase,
    RemoveLeadAttachmentUseCase,
    SubmitLeadUseCase,
    
    // Repository DI tokens
    {
      provide: LEAD_REPOSITORY,
      useClass: LeadRepository,
    },
    {
      provide: LEAD_COLLECTION_REPOSITORY,
      useClass: LeadCollectionRepository,
    },
    {
      provide: LEAD_ATTACHMENT_REPOSITORY,
      useClass: PrismaLeadAttachmentRepository,
    },
  ],
  exports: [
    LeadService,
    LeadCollectionService,
    LeadRepository,
    LEAD_REPOSITORY,
    LEAD_COLLECTION_REPOSITORY,
    LEAD_ATTACHMENT_REPOSITORY,
    CreateLeadWithAttachmentsUseCase,
  ],
})
export class ZarpLeadsModule {}
