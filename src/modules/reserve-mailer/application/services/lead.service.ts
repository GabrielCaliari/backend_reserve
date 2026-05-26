import { Injectable } from '@nestjs/common';
import { ERROR_FIND_LEAD, ERROR_CREATE_LEAD } from '../../domain/constants';
import LeadRepository from '../../../reserve-leads/infrastructure/repositories/lead.repository';
import { errorResponse, successResponse } from '../../../../shared/helpers';
import { CreateLead } from '../dtos/lead.dto';
import { ELeadStatus, Lead } from '../../../reserve-leads/domain/entities/lead.entity';
import PhoneNumber from '../../../../shared/domain/value-objects/phone-number.vo';
import Email from '../../../../shared/domain/value-objects/email.vo';

@Injectable()
export class LeadService {
    constructor(
        private readonly leadRepository: LeadRepository,
    ) { }

    async createLead(data: CreateLead) {
        try {
            const lead = new Lead({
                ...(data.phone_number ? { phone_number: new PhoneNumber(data.phone_number) } : {}),
                ...(data.email ? { email: new Email(data.email) } : {}),
                ...(data.name ? { name: data.name } : {}),
                ...(data.data ? { data: data.data } : {}),
                ...(data.origin_font ? { origin_font: data.origin_font } : {}),
                ...(data.description ? { description: data.description } : {}),
                origin: data.origin,
                status: ELeadStatus.new
            });

            const raw = await this.leadRepository.create(lead)

            return successResponse({
                id: raw.id
            });
        } catch (err) {
            return errorResponse(ERROR_CREATE_LEAD, 500, err);
        }
    }

    async findLeads({ page = 1, limit = 30 }) {
        try {
            const { raws, count } = await this.leadRepository.find({
                page,
                limit,
            });

            return successResponse({
                leads: raws.map(raw => {
                    return {
                        ...raw,
                        ...(raw.phone_number ? { phone_number: raw.phone_number.toString() } : {}),
                        ...(raw.email ? { email: raw.email.toString() } : {})
                    }
                }),
                page: {
                    count,
                    count_pages: Math.ceil(count / limit),
                    current_page: page,
                    limit
                }
            })
        } catch (error) {
            return errorResponse(ERROR_FIND_LEAD, 500, error);
        }
    }
}
