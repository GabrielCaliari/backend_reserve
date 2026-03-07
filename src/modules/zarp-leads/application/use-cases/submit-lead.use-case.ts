import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ILeadRepository, LEAD_REPOSITORY } from '../../domain/interfaces/lead.repository.interface';
import { Lead, ELeadStatus, EOriginLead } from '../../domain/entities/lead.entity';
import { SubmitLeadDto } from '../dtos/submit-lead.dto';
import Email from '../../../../shared/domain/value-objects/email.vo';
import PhoneNumber from '../../../../shared/domain/value-objects/phone-number.vo';

export interface TenantContext {
  tenantId: string;
  collectionId: string;
}

@Injectable()
export class SubmitLeadUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY)
    private readonly leadRepository: ILeadRepository,
  ) {}

  async execute(dto: SubmitLeadDto, context: TenantContext): Promise<{ leadId: string }> {
    // Validate data field size (max 100KB)
    if (dto.data) {
      const dataSize = JSON.stringify(dto.data).length;
      if (dataSize > 100 * 1024) {
        throw new BadRequestException('Data payload too large');
      }
    }

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
}
