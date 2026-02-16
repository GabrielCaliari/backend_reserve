import { Module } from '@nestjs/common';
import { LeadController } from '@/modules/zarp-leads/infrastructure/controllers/lead.controller';
import { LeadService } from '@/modules/zarp-leads/application/services/lead.service';
import LeadRepository from '@/modules/zarp-leads/infrastructure/repositories/lead.repository';
import { LEAD_REPOSITORY } from '@/modules/zarp-leads/domain/interfaces';
import { ZarpAuthModule } from '@/modules/zarp-auth/zarp-auth.module';

/**
 * Zarp Leads Module
 * Bounded context for lead management
 *
 * Implements:
 * - Lead CRUD operations
 * - Lead listing with pagination
 * - Lead status updates
 *
 * Exports:
 * - LeadService and LeadRepository for cross-context consumers
 */
@Module({
  imports: [
    ZarpAuthModule,
  ],
  controllers: [
    LeadController,
  ],
  providers: [
    LeadService,
    LeadRepository,
    {
      provide: LEAD_REPOSITORY,
      useClass: LeadRepository,
    },
  ],
  exports: [
    LeadService,
    LeadRepository,
    LEAD_REPOSITORY,
  ],
})
export class ZarpLeadsModule {}
