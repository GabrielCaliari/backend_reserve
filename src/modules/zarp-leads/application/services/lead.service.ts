import { Injectable } from '@nestjs/common';
import { ERROR_FIND_LEAD, ERROR_CREATE_LEAD } from '@/modules/zarp-leads/domain/constants';
import LeadRepository from '@/modules/zarp-leads/infrastructure/repositories/lead.repository';
import { errorResponse, successResponse } from '@/shared/helpers';
import { CreateLeadDto } from '@/modules/zarp-leads/application/dtos/lead.dto';
import { ELeadStatus, Lead } from '@/modules/zarp-leads/domain/entities/lead.entity';
import PhoneNumber from '@/shared/domain/value-objects/phone-number.vo';
import Email from '@/shared/domain/value-objects/email.vo';

@Injectable()
export class LeadService {
    constructor(
        private readonly leadRepository: LeadRepository,
    ) { }

    async createLead(data: CreateLeadDto) {
        // ... (existing implementation)
        return this.createCollectionLead(data);
    }

    async createCollectionLead(data: CreateLeadDto, collection?: { id: number; tenantId: number }) {
        try {
            const lead = new Lead({
                ...(data.phone_number ? { phone_number: new PhoneNumber(data.phone_number) } : {}),
                ...(data.email ? { email: new Email(data.email) } : {}),
                ...(data.name ? { name: data.name } : {}),
                ...(data.data ? { data: data.data } : {}),
                ...(data.origin_font ? { origin_font: data.origin_font } : {}),
                ...(data.description ? { description: data.description } : {}),
                origin: data.origin,
                status: ELeadStatus.new,
                ...(collection ? { collectionId: collection.id, tenantId: collection.tenantId } : {})
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
                        ...(raw.email ? { email: raw.email.toString() } : {}),
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

    async findLeadById(leadId: number) {
        try {
            const lead = await this.leadRepository.findById(leadId);

            if (!lead) {
                return errorResponse('404:Lead not found', 404);
            }

            return successResponse(lead);
        } catch (error) {
            return errorResponse(ERROR_FIND_LEAD, 500, error);
        }
    }

    async updateLeadStatus(leadId: number, status: ELeadStatus) {
        try {
            const lead = await this.leadRepository.findById(leadId);

            if (!lead) {
                return errorResponse('404:Lead not found', 404);
            }

            const updated = await this.leadRepository.update(leadId, { status });

            return successResponse({
                id: updated.id,
            });
        } catch (error) {
            return errorResponse('500:Erro ao atualizar o lead', 500, error);
        }
    }

    async findLeadsByCollection(collectionId: number, { page = 1, limit = 30 }) {
        try {
            const { raws, count } = await this.leadRepository.find({
                page,
                limit,
                where: {
                    collection_id: collectionId,
                },
            });

            return successResponse({
                leads: raws.map(raw => {
                    return {
                        ...raw,
                        ...(raw.phone_number ? { phone_number: raw.phone_number.toString() } : {}),
                        ...(raw.email ? { email: raw.email.toString() } : {}),
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
