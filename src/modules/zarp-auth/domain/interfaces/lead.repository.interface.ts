import { Lead } from '@/modules/zarp-auth/domain/entities/lead.entity';
import { ILead } from '@/modules/zarp-auth/domain/enums/lead.enum';

export interface ILeadRepository {
    create(data: Lead): Promise<Lead>;
    update(lead_id: number, data: Partial<ILead>): Promise<any>;
    updateMany(where: any, data: Partial<ILead>): Promise<any>;
    findById(lead_id: number): Promise<any>;
    find(params: { page?: number; limit?: number; where?: any }): Promise<{ raws: Lead[]; count: number }>;
}

export const LEAD_REPOSITORY = Symbol('LEAD_REPOSITORY');
