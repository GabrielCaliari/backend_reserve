import { Injectable } from '@nestjs/common';
import { ERROR_FIND_LEAD, ERROR_CREATE_LEAD } from '../../domain/constants';
import LeadRepository from '../../infrastructure/repositories/lead.repository';
import { errorResponse, successResponse } from '../../../../shared/helpers';
import { CreateLeadDto, UpdateLeadDto } from '../dtos/lead.dto';
import { ELeadStatus, Lead } from '../../domain/entities/lead.entity';
import PhoneNumber from '../../../../shared/domain/value-objects/phone-number.vo';
import Email from '../../../../shared/domain/value-objects/email.vo';
import { GeolocationProvider } from '../../../../shared/providers/geolocation.provider';
import { NotificationEventService } from '../../../zarp-notifications/application/services/notification-event.service';
import { NOTIFICATION_EVENTS } from '../../../zarp-notifications/domain/constants/notification-events';

@Injectable()
export class LeadService {
    constructor(
        private readonly leadRepository: LeadRepository,
        private readonly geolocationProvider: GeolocationProvider,
        private readonly notificationEventService: NotificationEventService,
    ) { }

    async createLead(data: CreateLeadDto) {
        // ... (existing implementation)
        return this.createCollectionLead(data);
    }

    async createCollectionLead(data: CreateLeadDto, collection?: { id: string; tenantId: string; ipAddress?: string; userAgent?: string }) {
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
                ...(collection ? { 
                    collectionId: collection.id, 
                    tenantId: collection.tenantId,
                    ipAddress: collection.ipAddress,
                    userAgent: collection.userAgent,
                } : {})
            });

            // Geolocate IP address if available
            if (collection?.ipAddress) {
                try {
                    const geoData = await this.geolocationProvider.resolveIp(collection.ipAddress);
                    
                    if (geoData) {
                        lead.country = geoData.country;
                        lead.city = geoData.city;
                        lead.region = geoData.region;
                    }
                } catch (geoError) {
                    // Log but don't fail lead creation if geolocation fails
                    console.warn('Geolocation failed:', geoError.message);
                }
            }

            const raw = await this.leadRepository.create(lead)

            if (collection?.tenantId) {
                this.notificationEventService
                    .dispatch(NOTIFICATION_EVENTS.LEAD_CREATED, collection.tenantId, { lead_id: raw.id })
                    .catch(() => {});
            }

            return successResponse({
                id: raw.id
            });
        } catch (err) {
            return errorResponse(ERROR_CREATE_LEAD, 500, err);
        }
    }

    async findLeads({ page = 1, limit = 30 }, tenantId?: string) {
        try {
            const where: any = {};
            if (tenantId) where.tenant_id = tenantId;
            const { raws, count } = await this.leadRepository.find({
                page,
                limit,
                where,
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

    async findLeadById(leadId: string, tenantId?: string) {
        try {
            const lead = await this.leadRepository.findById(leadId);

            if (!lead || (tenantId && lead.tenant_id !== tenantId)) {
                return errorResponse('404:Lead not found', 404);
            }

            return successResponse(lead);
        } catch (error) {
            return errorResponse(ERROR_FIND_LEAD, 500, error);
        }
    }

    async updateLeadStatus(leadId: string, status: ELeadStatus, tenantId?: string) {
        try {
            const lead = await this.leadRepository.findById(leadId);

            if (!lead || (tenantId && lead.tenant_id !== tenantId)) {
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

    async updateLead(leadId: string, dto: UpdateLeadDto, tenantId?: string) {
        try {
            const lead = await this.leadRepository.findById(leadId);

            if (!lead || (tenantId && lead.tenant_id !== tenantId)) {
                return errorResponse('404:Lead not found', 404);
            }

            const updated = await this.leadRepository.update(leadId, {
                ...(dto.name !== undefined ? { name: dto.name } : {}),
                ...(dto.email !== undefined ? { email: dto.email } : {}),
                ...(dto.phone_number !== undefined ? { phone_number: dto.phone_number } : {}),
                ...(dto.origin !== undefined ? { origin: dto.origin } : {}),
                ...(dto.origin_font !== undefined ? { origin_font: dto.origin_font } : {}),
                ...(dto.description !== undefined ? { description: dto.description } : {}),
                ...(dto.data !== undefined ? { data: dto.data } : {}),
            });

            return successResponse({ id: updated.id });
        } catch (error) {
            return errorResponse('500:Erro ao atualizar o lead', 500, error);
        }
    }

    async deleteLead(leadId: string, tenantId?: string) {
        try {
            const lead = await this.leadRepository.findById(leadId);

            if (!lead || (tenantId && lead.tenant_id !== tenantId)) {
                return errorResponse('404:Lead not found', 404);
            }

            await this.leadRepository.delete(leadId);

            return successResponse({ id: leadId });
        } catch (error) {
            return errorResponse('500:Erro ao deletar o lead', 500, error);
        }
    }

    async findLeadsByTenant(tenantId: string, { page = 1, limit = 30 }: { page?: number; limit?: number }) {
        try {
            const { raws, count } = await this.leadRepository.find({
                page,
                limit,
                where: {
                    tenant_id: tenantId,
                },
            });

            return successResponse({
                leads: raws.map(raw => ({
                    ...raw,
                    ...(raw.phone_number ? { phone_number: raw.phone_number.toString() } : {}),
                    ...(raw.email ? { email: raw.email.toString() } : {}),
                })),
                page: {
                    count,
                    count_pages: Math.ceil(count / limit),
                    current_page: page,
                    limit,
                },
            });
        } catch (error) {
            return errorResponse(ERROR_FIND_LEAD, 500, error);
        }
    }

    async findLeadsByCollection(collectionId: string, { page = 1, limit = 30 }) {
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
