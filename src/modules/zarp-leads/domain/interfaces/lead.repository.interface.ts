import { Lead } from '../entities/lead.entity';
import { ILead } from '../enums/lead.enum';

export interface ILeadRepository {
    create(data: Lead): Promise<Lead>;
    update(lead_id: string, data: Partial<ILead>): Promise<any>;
    updateMany(where: any, data: Partial<ILead>): Promise<any>;
    findById(lead_id: string): Promise<any>;
    find(params: { page?: number; limit?: number; where?: any }): Promise<{ raws: Lead[]; count: number }>;
    delete(lead_id: string): Promise<void>;
}

export const LEAD_REPOSITORY = Symbol('LEAD_REPOSITORY');
