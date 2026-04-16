import { Module } from '@nestjs/common';
import { LeadController } from './infrastructure/controllers/lead.controller';
import { LeadCollectionController } from './infrastructure/controllers/lead-collection.controller';
import { LeadCaptureController } from './infrastructure/controllers/lead-capture.controller';
import { PublicLeadController } from './infrastructure/controllers/public-lead.controller';
import { PublicAppointmentController } from './infrastructure/controllers/public-appointment.controller';
import { AdminAppointmentScheduleConfigController } from './infrastructure/controllers/admin-appointment-schedule-config.controller';
import { AdminAppointmentController } from './infrastructure/controllers/admin-appointment.controller';
import { AdminBlockedPeriodController } from './infrastructure/controllers/admin-blocked-period.controller';
import { LeadService } from './application/services/lead.service';
import { LeadCollectionService } from './application/services/lead-collection.service';
import LeadRepository from './infrastructure/repositories/lead.repository';
import { LeadCollectionRepository } from './infrastructure/repositories/lead-collection.repository';
import { PrismaLeadAttachmentRepository } from './infrastructure/repositories/lead-attachment.repository';
import { PrismaAppointmentScheduleConfigRepository } from './infrastructure/repositories/prisma-appointment-schedule-config.repository';
import { PrismaAppointmentBlockedPeriodRepository } from './infrastructure/repositories/prisma-appointment-blocked-period.repository';
import { PrismaAppointmentRepository } from './infrastructure/repositories/prisma-appointment.repository';
import { CollectionSecretKeyGuard } from './infrastructure/guards/collection-secret-key.guard';
import { TenantKeyGuard } from './infrastructure/guards/tenant-key.guard';
import {
  LEAD_REPOSITORY,
  LEAD_COLLECTION_REPOSITORY,
  LEAD_ATTACHMENT_REPOSITORY,
  APPOINTMENT_SCHEDULE_CONFIG_REPOSITORY,
  APPOINTMENT_BLOCKED_PERIOD_REPOSITORY,
  APPOINTMENT_REPOSITORY,
} from './domain/interfaces';
import { ZarpAuthModule } from '../zarp-auth/zarp-auth.module';
import { CreateLeadWithAttachmentsUseCase } from './application/use-cases/create-lead-with-attachments.use-case';
import { AttachFileToLeadUseCase } from './application/use-cases/attach-file-to-lead.use-case';
import { RemoveLeadAttachmentUseCase } from './application/use-cases/remove-lead-attachment.use-case';
import { SubmitLeadUseCase } from './application/use-cases/submit-lead.use-case';
import { UpdateLeadUseCase } from './application/use-cases/update-lead.use-case';
import { UpsertScheduleConfigUseCase } from './application/use-cases/upsert-schedule-config.use-case';
import { GetScheduleConfigUseCase } from './application/use-cases/get-schedule-config.use-case';
import { GetSlotAvailabilityUseCase } from './application/use-cases/get-slot-availability.use-case';
import { BookAppointmentUseCase } from './application/use-cases/book-appointment.use-case';
import { ListAppointmentsUseCase } from './application/use-cases/list-appointments.use-case';
import { GetAppointmentUseCase } from './application/use-cases/get-appointment.use-case';
import { CancelAppointmentUseCase } from './application/use-cases/cancel-appointment.use-case';
import { CompleteAppointmentUseCase } from './application/use-cases/complete-appointment.use-case';
import { CreateBlockedPeriodUseCase } from './application/use-cases/create-blocked-period.use-case';
import { ListBlockedPeriodsUseCase } from './application/use-cases/list-blocked-periods.use-case';
import { DeleteBlockedPeriodUseCase } from './application/use-cases/delete-blocked-period.use-case';
import { UpdateBlockedPeriodUseCase } from './application/use-cases/update-blocked-period.use-case';
import { BookAppointmentForLeadUseCase } from './application/use-cases/book-appointment-for-lead.use-case';
import { SlotDerivationService } from './domain/services/slot-derivation.service';
import { GeolocationProvider } from '../../shared/providers/geolocation.provider';

/**
 * Zarp Leads Module
 * Bounded context for lead management with file attachment support and appointment scheduling
 *
 * Implements:
 * - Lead CRUD operations
 * - Lead file attachments (CVs, documents)
 * - Lead listing with pagination
 * - Lead status updates
 * - Lead Collections with source metadata (Tenant-scoped)
 * - Lead Capture endpoints (public with secret key authentication)
 * - IP geolocation tracking
 * - Appointment scheduling with slot management
 * - Schedule configuration (working hours, capacity, blocked periods)
 * - Atomic lead submission with appointment booking
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
    LeadCollectionController,  // must be before LeadController (`@Get(':id')` would swallow /collections)
    LeadCaptureController,
    PublicLeadController,
    PublicAppointmentController,
    AdminAppointmentScheduleConfigController,  // /admin/appointments/schedule-config
    AdminBlockedPeriodController,              // /admin/appointments/blocked-periods  
    AdminAppointmentController,                // /admin/appointments (must be LAST - has /:id route)
    LeadController,
  ],
  providers: [
    // Services (legacy, for backward compatibility)
    LeadService,
    LeadCollectionService,
    
    // Domain Services
    SlotDerivationService,
    
    // Repositories
    LeadRepository,
    LeadCollectionRepository,
    PrismaLeadAttachmentRepository,
    PrismaAppointmentScheduleConfigRepository,
    PrismaAppointmentBlockedPeriodRepository,
    PrismaAppointmentRepository,
    
    // Guards
    CollectionSecretKeyGuard,
    TenantKeyGuard,
    
    // Providers
    GeolocationProvider,
    
    // Lead Use Cases
    CreateLeadWithAttachmentsUseCase,
    AttachFileToLeadUseCase,
    RemoveLeadAttachmentUseCase,
    SubmitLeadUseCase,
    UpdateLeadUseCase,
    
    // Appointment Use Cases
    UpsertScheduleConfigUseCase,
    GetScheduleConfigUseCase,
    GetSlotAvailabilityUseCase,
    BookAppointmentUseCase,
    BookAppointmentForLeadUseCase,
    ListAppointmentsUseCase,
    GetAppointmentUseCase,
    CancelAppointmentUseCase,
    CompleteAppointmentUseCase,
    CreateBlockedPeriodUseCase,
    ListBlockedPeriodsUseCase,
    DeleteBlockedPeriodUseCase,
    UpdateBlockedPeriodUseCase,
    
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
    {
      provide: APPOINTMENT_SCHEDULE_CONFIG_REPOSITORY,
      useClass: PrismaAppointmentScheduleConfigRepository,
    },
    {
      provide: APPOINTMENT_BLOCKED_PERIOD_REPOSITORY,
      useClass: PrismaAppointmentBlockedPeriodRepository,
    },
    {
      provide: APPOINTMENT_REPOSITORY,
      useClass: PrismaAppointmentRepository,
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
