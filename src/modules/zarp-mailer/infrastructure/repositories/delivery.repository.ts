import { Delivery, OpenTracking, PrismaClient } from "../../../../generated/prisma/client";
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';

@Injectable()
export class DeliveryRepository {
    constructor(private readonly prisma: PrismaService) {}
    async createInBatch(deliveries: {
        email_id: number,
        email_lead_id: number,
        email_provider: string,
        email_sent_to: string,
        status: number,
        campaign_batch_id: number,
        tracking_code: string,
    }[], tx?: PrismaClient) {
        try {
            const prisma = tx || this.prisma;

            const result = await prisma.delivery.createManyAndReturn({
                data: deliveries
            });

            return result;
        } catch (err) {
            throw new RepositoryException('Error creating deliveries in batch', err);
        }
    }

    async selectAllByCampaignBatchId(campaignBatchId: number, prisma?: PrismaClient) {
        try {
            const conn = prisma ?? this.prisma;
            const deliveries = await conn.delivery.findMany({
                where: {
                    campaign_batch_id: campaignBatchId
                },
                include: {
                    email: true
                }
            });

            return deliveries;
        } catch (err) {
            throw new RepositoryException('Error selecting deliveries by campaign batch id', err);
        }
    }

    async findByTrackingCode(trackingCode: string, prisma?: PrismaClient) {
        try {
            const conn = prisma ?? this.prisma;
            const delivery = await conn.delivery.findFirst({
                where: { tracking_code: trackingCode }
            });

            return delivery;
        } catch (err) {
            throw new RepositoryException('Erro ao buscar delivery por tracking code', err);
        }
    }

    async update(id: number, data: Partial<Delivery>, tx?: PrismaClient) {
        try {
            const prisma = tx || this.prisma;
            const result = await prisma.delivery.update({
                where: { id },
                data
            });

            return result;
        } catch (err) {
            throw new RepositoryException('Error updating delivery', err);
        }
    }

    async createOpenTracking(data: {
        delivery_id: number,
        open_date: Date,
        bot_chance: number,
        request_open_json: any
    }, tx?: PrismaClient) {
        try {
            const prisma = tx || this.prisma;
            const result = await prisma.openTracking.create({
                data: {
                    delivery_id: data.delivery_id,
                    open_date: data.open_date,
                    bot_chance: data.bot_chance,
                    request_open_json: data.request_open_json,
                    
                }
            });

            return result;
        } catch (err) {
            throw new RepositoryException('Error creating open tracking', err);
        }
    }
}