import { Inject, Injectable } from '@nestjs/common';
import { ILeadRepository, LEAD_REPOSITORY } from '../../domain/interfaces/lead.repository.interface';

export interface UpdateLeadDto {
  message?: string;
  source?: string;
  data?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class UpdateLeadUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY)
    private readonly leadRepository: ILeadRepository,
  ) {}

  async execute(leadId: string, dto: UpdateLeadDto, tenantId: string): Promise<{ success: boolean } | null> {
    const lead = await this.leadRepository.findById(leadId);

    if (!lead || lead.tenant_id !== tenantId) {
      return null;
    }

    const updateData: Record<string, any> = {};
    if (dto.message !== undefined) updateData.description = dto.message;
    if (dto.source !== undefined) updateData.origin_font = dto.source;
    if (dto.data !== undefined) updateData.data = dto.data;
    if (dto.ipAddress !== undefined) updateData.ip_address = dto.ipAddress;
    if (dto.userAgent !== undefined) updateData.user_agent = dto.userAgent;

    await this.leadRepository.update(leadId, updateData);

    return { success: true };
  }
}
