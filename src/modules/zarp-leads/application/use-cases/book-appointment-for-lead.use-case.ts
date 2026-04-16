import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { Appointment } from '../../domain/entities/appointment.entity';
import { BookAppointmentUseCase } from './book-appointment.use-case';
import { ILeadRepository, LEAD_REPOSITORY } from '../../domain/interfaces/lead.repository.interface';

export interface BookAppointmentForLeadResult {
  success: boolean;
  appointmentId?: string;
}

@Injectable()
export class BookAppointmentForLeadUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY)
    private readonly leadRepository: ILeadRepository,
    private readonly prisma: PrismaService,
    private readonly bookAppointmentUseCase: BookAppointmentUseCase,
  ) {}

  /**
   * Books an appointment for an already-existing lead.
   * Used by the PATCH /leads/:leadId flow where the lead was created first
   * and the appointment data arrives in a second step.
   *
   * Returns null if the lead is not found or belongs to a different tenant.
   */
  async execute(
    leadId: string,
    tenantId: string,
    appointmentDate: string,
    appointmentTime: string,
    selectedProduct?: string,
  ): Promise<BookAppointmentForLeadResult | null> {
    // Verify lead exists and belongs to this tenant
    const lead = await this.leadRepository.findById(leadId);
    if (!lead || lead.tenant_id !== tenantId) {
      return null;
    }

    // Atomic booking inside a transaction
    const appointment: Appointment = await this.prisma.$transaction(async (tx) => {
      // Parse date with fixed time to avoid timezone issues
      const date = new Date(appointmentDate + 'T12:00:00');
      
      return this.bookAppointmentUseCase.execute(
        tenantId,
        date,
        appointmentTime,
        leadId,
        selectedProduct,
        tx,
      );
    });

    return { success: true, appointmentId: appointment.id! };
  }
}
