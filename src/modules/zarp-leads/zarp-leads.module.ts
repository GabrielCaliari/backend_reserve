import { Module } from '@nestjs/common';
import { LeadController } from '@/modules/zarp-leads/infrastructure/controllers/lead.controller';
import { LeadCollectionController } from '@/modules/zarp-leads/infrastructure/controllers/lead-collection.controller';
import { LeadCaptureController } from '@/modules/zarp-leads/infrastructure/controllers/lead-capture.controller';
import { LeadService } from '@/modules/zarp-leads/application/services/lead.service';
import { LeadCollectionService } from '@/modules/zarp-leads/application/services/lead-collection.service';
import LeadRepository from '@/modules/zarp-leads/infrastructure/repositories/lead.repository';
import { LeadCollectionRepository } from '@/modules/zarp-leads/infrastructure/repositories/lead-collection.repository';
import { CollectionSecretKeyGuard } from '@/modules/zarp-leads/infrastructure/guards/collection-secret-key.guard';
import { LEAD_REPOSITORY, LEAD_COLLECTION_REPOSITORY } from '@/modules/zarp-leads/domain/interfaces';
import { ZarpAuthModule } from '@/modules/zarp-auth/zarp-auth.module';

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
