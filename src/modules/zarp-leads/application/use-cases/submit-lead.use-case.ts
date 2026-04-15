import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ILeadRepository, LEAD_REPOSITORY } from '../../domain/interfaces/lead.repository.interface';
import { Lead, ELeadStatus, EOriginLead } from '../../domain/entities/lead.entity';
import { SubmitLeadDto } from '../dtos/submit-lead.dto';
import Email from '../../../../shared/domain/value-objects/email.vo';
import PhoneNumber from '../../../../shared/domain/value-objects/phone-number.vo';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { BookAppointmentUseCase } from './book-appointment.use-case';

export interface TenantContext {
  tenantId: string;
  collectionId: string;
}

@Injectable()
export class SubmitLeadUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY)
    private readonly leadRepository: ILeadRepository,
    private readonly prisma: PrismaService,
    private readonly bookAppointmentUseCase: BookAppointmentUseCase,
  ) {}

  async execute(dto: SubmitLeadDto, context: TenantContext): Promise<{ leadId: string; appointmentId?: string }> {
    // Validate data field size (max 100KB)
    if (dto.data) {
      const dataSize = JSON.stringify(dto.data).length;
      if (dataSize > 100 * 1024) {
        throw new BadRequestException('Data payload too large');
      }
    }

    // Check if appointment data is present
    const hasAppointmentData =
      dto.data?.appointmentDate && dto.data?.appointmentTime;

    // If no appointment data, use existing flow (backward compatible)
    if (!hasAppointmentData) {
      // Create value objects
      const email = new Email(dto.email);
      const phoneNumber = dto.phone ? new PhoneNumber(dto.phone) : undefined;

      // Construct Lead entity
      const lead = new Lead({
        name: dto.name,
        email,
        phone_number: phoneNumber,
        description: dto.message,
        origin_font: dto.source,
        data: dto.data,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        origin: EOriginLead.page,
        status: ELeadStatus.new,
        tenantId: context.tenantId,
        collectionId: context.collectionId,
      });

      // Persist lead
      const savedLead = await this.leadRepository.create(lead);

      return { leadId: savedLead.id! };
    }

    // Atomic booking flow: wrap lead creation + appointment booking in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create value objects
      const email = new Email(dto.email);
      const phoneNumber = dto.phone ? new PhoneNumber(dto.phone) : undefined;

      // Construct Lead entity
      const lead = new Lead({
        name: dto.name,
        email,
        phone_number: phoneNumber,
        description: dto.message,
        origin_font: dto.source,
        data: dto.data,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        origin: EOriginLead.page,
        status: ELeadStatus.new,
        tenantId: context.tenantId,
        collectionId: context.collectionId,
      });

      // Persist lead (using transaction client)
      const savedLead = await tx.lead.create({
        data: {
          ...(lead.name ? { name: lead.name } : {}),
          ...(lead.email ? { email: lead.email.toString() } : {}),
          ...(lead.description ? { description: lead.description } : {}),
          ...(lead.phone_number ? { phone_number: lead.phone_number.toString() } : {}),
          ...(lead.origin ? { origin: lead.origin } : {}),
          ...(lead.origin_font ? { origin_font: lead.origin_font } : {}),
          status: lead.status,
          ...(lead.data ? { data: lead.data } : {}),
          ...(lead.collectionId ? { collection_id: lead.collectionId } : {}),
          ...(lead.tenantId ? { tenant_id: lead.tenantId } : {}),
          ...(lead.ipAddress ? { ip_address: lead.ipAddress } : {}),
          ...(lead.userAgent ? { user_agent: lead.userAgent } : {}),
          ...(lead.country ? { country: lead.country } : {}),
          ...(lead.city ? { city: lead.city } : {}),
          ...(lead.region ? { region: lead.region } : {}),
        },
      });

      // Parse appointment data
      const appointmentDate = new Date(dto.data.appointmentDate);
      const appointmentTime = dto.data.appointmentTime;
      const selectedProduct = dto.data.selectedProduct;

      // Book appointment (using transaction client)
      const appointment = await this.bookAppointmentUseCase.execute(
        context.tenantId,
        appointmentDate,
        appointmentTime,
        savedLead.id,
        selectedProduct,
        tx,
      );

      return {
        leadId: savedLead.id,
        appointmentId: appointment.id!,
      };
    });

    return result;
  }
}
