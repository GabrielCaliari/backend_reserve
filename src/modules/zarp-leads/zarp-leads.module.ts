import { Module } from '@nestjs/common';
import { LeadController } from './infrastructure/controllers/lead.controller';
import { LeadCollectionController } from './infrastructure/controllers/lead-collection.controller';
import { LeadCaptureController } from './infrastructure/controllers/lead-capture.controller';
import { LeadService } from './application/services/lead.service';
import { LeadCollectionService } from './application/services/lead-collection.service';
import LeadRepository from './infrastructure/repositories/lead.repository';
import { LeadCollectionRepository } from './infrastructure/repositories/lead-collection.repository';
import { CollectionSecretKeyGuard } from './infrastructure/guards/collection-secret-key.guard';
import { LEAD_REPOSITORY, LEAD_COLLECTION_REPOSITORY } from './domain/interfaces';
import { ZarpAuthModule } from '../zarp-auth/zarp-auth.module';

/**
 * Zarp Leads Module
 * Bounded context for lead management
 *
 * Implements:
 * - Lead CRUD operations
 * - Lead listing with pagination
 * - Lead status updates
 * - Lead Collections (Tenant-scoped)
 * - Lead Capture endpoints (public/private/restricted)
 *
 * Exports:
 * - LeadService and LeadRepository for cross-context consumers
 * - LeadCollectionService
 */
@Module({
  imports: [
    ZarpAuthModule,
  ],
  controllers: [
    LeadController,
    LeadCollectionController,
    LeadCaptureController,
  ],
  providers: [
    LeadService,
    LeadCollectionService,
    LeadRepository,
    LeadCollectionRepository,
    CollectionSecretKeyGuard,
    {
      provide: LEAD_REPOSITORY,
      useClass: LeadRepository,
    },
    {
      provide: LEAD_COLLECTION_REPOSITORY,
      useClass: LeadCollectionRepository,
    },
  ],
  exports: [
    LeadService,
    LeadCollectionService,
    LeadRepository,
    LEAD_REPOSITORY,
    LEAD_COLLECTION_REPOSITORY,
  ],
})
export class ZarpLeadsModule {}
