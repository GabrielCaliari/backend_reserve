import { PrismaClient } from "@/generated/prisma/client";
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { RepositoryException } from '@/shared/exceptions';

@Injectable()
export default class EmailLeadRepository {
    constructor(private readonly prisma: PrismaService) {}
    public async selectAllByEmailCampaignIdAndEmails(emailCampaignId: number, emails: string[]) {
        try {
            const leads = await this.prisma.emailLead.findMany({
                where: {
                    email_campaign_id: emailCampaignId,
                    email: {
                        in: emails
                    }
                }
            });

            return leads;
        } catch (err) {
            throw new RepositoryException('Error selecting all leads by email campaign id', err);
        }
    }

    public async selectAllByEmailCampaignId(emailCampaignId: number) {
        try {
            const leads = await this.prisma.emailLead.findMany({
                where: {
                    email_campaign_id: emailCampaignId
                }
            });

            return leads;
        } catch (err) {
            throw new RepositoryException('Error selecting all leads by email campaign id', err);
        }
    }

    public async createLead(lead: {
        email: string,
        email_campaign_id: number,
        status: number
    }[],
        tx?: PrismaClient
    ) {
        try {
            let conn = tx ?? this.prisma;
            const leads = await conn.lead.createMany({ data: lead });
            return leads;
        } catch (err) {
            throw new RepositoryException('Error creating leads', err);
        }
    }

    public async countByEmailCampaignId(emailCampaignId: number, prisma?: PrismaClient) {
        try {
            const conn = prisma ?? this.prisma;
            const totalLeads = await conn.emailLead.count({ where: { email_campaign_id: emailCampaignId } });
            return totalLeads;
        } catch (err) {
            throw new RepositoryException('Error counting leads by email campaign id', err);
        }
    }

    public async selectByEmailCampaignIdWithPagination(emailCampaignId: number, limit: number, offset: number) {
        try {
            const leads = await this.prisma.emailLead.findMany({
                where: { email_campaign_id: emailCampaignId },
                skip: offset,
                take: limit
            });
            return leads;
        } catch (err) {
            throw new RepositoryException('Error selecting leads by email campaign id with pagination', err);
        }
    }
}
