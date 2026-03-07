import { Prisma } from "../../../../generated/prisma/client";
import { ICreateLead, ILead } from '../../domain/enums/lead.enum';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { Lead } from '../../domain/entities/lead.entity';
import PhoneNumber from '../../../../shared/domain/value-objects/phone-number.vo';
import Email from '../../../../shared/domain/value-objects/email.vo';
import { ILeadRepository } from '../../domain/interfaces';

export { ICreateLead };

@Injectable()
export default class LeadRepository implements ILeadRepository {
    constructor(private readonly prisma: PrismaService) {}
    async create(data: Lead) {
        try {
            const raw = await this.prisma.lead.create({
                data: {
                    ...(data.name ? { name: data.name } : {}),
                    ...(data.email ? { email: data.email.toString() } : {}),
                    ...(data.description ? { description: data.description } : {}),
                    ...(data.phone_number ? { phone_number: data.phone_number.toString() } : {}),
                    ...(data.origin ? { origin: data.origin } : {}),
                    ...(data.origin_font ? { origin_font: data.origin_font } : {}),
                    status: data.status,
                    ...(data.data ? { data: data.data } : {}),
                    ...(data.collectionId ? { collection_id: data.collectionId } : {}),
                    ...(data.tenantId ? { tenant_id: data.tenantId } : {}),
                    ...(data.ipAddress ? { ip_address: data.ipAddress } : {}),
                    ...(data.userAgent ? { user_agent: data.userAgent } : {}),
                    ...(data.country ? { country: data.country } : {}),
                    ...(data.city ? { city: data.city } : {}),
                    ...(data.region ? { region: data.region } : {}),
                }
            });

            return new Lead({
                id: raw.id,
                ...(raw.phone_number ? { phone_number: new PhoneNumber(raw.phone_number) } : {}),
                ...(raw.email ? { email: new Email(raw.email) } : {}),
                ...(raw.name ? { name: raw.name } : {}),
                ...(raw.data ? { data: raw.data as Prisma.InputJsonValue } : {}),
                ...(raw.origin_font ? { origin_font: raw.origin_font } : {}),
                description: raw.description,
                origin: raw.origin,
                status: raw.status,
                created_at: raw.created_at,
                updated_at: raw.updated_at,
                ...(raw.collection_id ? { collectionId: raw.collection_id } : {}),
                ...(raw.tenant_id ? { tenantId: raw.tenant_id } : {}),
                ...(raw.ip_address ? { ipAddress: raw.ip_address } : {}),
                ...(raw.user_agent ? { userAgent: raw.user_agent } : {}),
                ...(raw.country ? { country: raw.country } : {}),
                ...(raw.city ? { city: raw.city } : {}),
                ...(raw.region ? { region: raw.region } : {}),
            });
        } catch (error) {
            throw new RepositoryException('Erro ao criar o lead', error);
        }
    }

    async update(lead_id: string, data: Partial<ILead>) {
        try {
            // Remove id from data to avoid type conflicts
            const { id, ...updateData } = data;
            const raw = await this.prisma.lead.update({
                where: { id: lead_id },
                data: updateData as any
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao atualizar os leads', error);
        }
    }

    async updateMany(where: Prisma.LeadWhereInput, data: Partial<ILead>) {
        try {
            // Remove id from data to avoid type conflicts
            const { id, ...updateData } = data;
            const raw = await this.prisma.lead.updateMany({
                where,
                data: updateData as any
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao atualizar os leads', error);
        }
    }

    async findById(lead_id: string) {
        try {
            const raw = await this.prisma.lead.findUnique({
                where: { id: lead_id }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao buscar o lead', error);
        }
    }

    async delete(lead_id: string): Promise<void> {
        try {
            await this.prisma.lead.delete({ where: { id: lead_id } });
        } catch (error) {
            throw new RepositoryException('Erro ao deletar o lead', error);
        }
    }

    async find({ page = 1, limit = 10, where = {} }: { page?: number, limit?: number, where?: Prisma.LeadWhereInput }) {
        try {
            const skip = (page - 1) * limit;

            const [data, count] = await Promise.all([
                this.prisma.lead.findMany({
                    skip,
                    take: limit,
                    orderBy: { created_at: 'desc' },
                    where
                }),
                this.prisma.lead.count({ where }),
            ]);

            return {
                raws: data.map(raw => {
                    return new Lead({
                        id: raw.id,
                        ...(raw.phone_number ? { phone_number: new PhoneNumber(raw.phone_number) } : {}),
                        ...(raw.email ? { email: new Email(raw.email) } : {}),
                        ...(raw.name ? { name: raw.name } : {}),
                        ...(raw.data ? { data: raw.data as Prisma.InputJsonValue } : {}),
                        ...(raw.origin_font ? { origin_font: raw.origin_font } : {}),
                        description: raw.description,
                        origin: raw.origin,
                        status: raw.status,
                        created_at: raw.created_at,
                        updated_at: raw.updated_at,
                        ...(raw.collection_id ? { collectionId: raw.collection_id } : {}),
                        ...(raw.tenant_id ? { tenantId: raw.tenant_id } : {}),
                        ...(raw.ip_address ? { ipAddress: raw.ip_address } : {}),
                        ...(raw.user_agent ? { userAgent: raw.user_agent } : {}),
                        ...(raw.country ? { country: raw.country } : {}),
                        ...(raw.city ? { city: raw.city } : {}),
                        ...(raw.region ? { region: raw.region } : {}),
                    });
                }),
                count: count,
            };
        } catch (error) {
            throw new RepositoryException('Erro ao listar os leads', error);
        }
    }
}
