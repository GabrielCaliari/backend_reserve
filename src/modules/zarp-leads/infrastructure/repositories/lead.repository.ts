import { Prisma } from "@/generated/prisma/client";
import { ICreateLead, ILead } from '@/modules/zarp-leads/domain/enums/lead.enum';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { RepositoryException } from '@/shared/exceptions';
import { Lead } from "@/modules/zarp-leads/domain/entities/lead.entity";
import PhoneNumber from "@/shared/domain/value-objects/phone-number.vo";
import Email from "@/shared/domain/value-objects/email.vo";
import { ILeadRepository } from '@/modules/zarp-leads/domain/interfaces';

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
            });
        } catch (error) {
            throw new RepositoryException('Erro ao criar o lead', error);
        }
    }

    async update(lead_id: number, data: Partial<ILead>) {
        try {
            const raw = await this.prisma.lead.update({
                where: { id: lead_id },
                data
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao atualizar os leads', error);
        }
    }

    async updateMany(where: Prisma.LeadWhereInput, data: Partial<ILead>) {
        try {
            const raw = await this.prisma.lead.updateMany({
                where,
                data
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao atualizar os leads', error);
        }
    }

    async findById(lead_id: number) {
        try {
            const raw = await this.prisma.lead.findUnique({
                where: { id: lead_id }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao buscar o lead', error);
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
                this.prisma.lead.count(),
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
                    });
                }),
                count: count,
            };
        } catch (error) {
            throw new RepositoryException('Erro ao listar os leads', error);
        }
    }
}
