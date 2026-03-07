import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { CampaignBatch, PrismaClient } from "../../../../generated/prisma/client";
import { ECampaignBatchStatus } from '../../domain/enums/campaign-batch-status.enum';

@Injectable()
export default class CampaignBatchRepository {
    constructor(private readonly prisma: PrismaService) {}
    async createMany(data: {
        total_leads: number;
        un_open_rate: number;
        un_click_rate: number;
        un_unsubscribe: number;
        un_success_rate?: number;
        un_failed_rate?: number;
        status: ECampaignBatchStatus;
        email_id?: number;
        started_at?: Date;
        finished_at?: Date;
        email_campaign_id: string;
    }[], prisma?: PrismaClient) {
        try {
            const conn = prisma ?? this.prisma;

            const campaignBatches = await conn.campaignBatch.createManyAndReturn({
                data: data
            });

            return campaignBatches;
        } catch (err) {
            throw new RepositoryException('Error creating campaign batches', err);
        }
    }

    async selectById(id: number, prisma?: PrismaClient) {
        try {
            const conn = prisma ?? this.prisma;
            const campaignBatch = await conn.campaignBatch.findUnique({ where: { id } });

            return campaignBatch;
        } catch (err) {
            throw new RepositoryException('Error selecting campaign batch by id', err);
        }
    }

    async update(id: number, data: Partial<CampaignBatch>, prisma?: PrismaClient) {
        try {
            const conn = prisma ?? this.prisma;
            const campaignBatch = await conn.campaignBatch.update({ where: { id }, data });

            return campaignBatch;
        } catch (err) {
            throw new RepositoryException('Error updating campaign batch', err);
        }
    }

    async selectAllByEmailCampaignId(emailCampaignId: string) {
        try {
            const campaignBatches = await this.prisma.campaignBatch.findMany({
                where: {
                    email_campaign_id: emailCampaignId
                }
            });

            return campaignBatches;
        } catch (err) {
            throw new RepositoryException('Error selecting campaign batches by email campaign id', err);
        }
    }

    async selectFirstByEmailCampaignIdAndStatus(emailCampaignId: string, status: ECampaignBatchStatus) {
        try {
            const campaignBatch = await this.prisma.campaignBatch.findFirst({
                where: { email_campaign_id: emailCampaignId, status }
            });

            return campaignBatch;
        } catch (err) {
            throw new RepositoryException('Error selecting first campaign batch by email campaign id and status', err);
        }
    }
}
