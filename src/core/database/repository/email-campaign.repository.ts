import { Prisma, PrismaClient } from "@prisma/client";
import RepositoryException from "src/core/exceptions/RepositoryException";
import prismaClient from "../prisma/prismaClient";
import { ECopyVariationType, EEmailCampaignStatus } from "src/@types/@Email-campaign";
import { isEmailCampaignDataValidToCreate } from "../validator/email-campaign.validator";

export default class EmailCampaignRepository {
    async create(
        {
            name,
            smtp_server_id,
        },
        tx?: PrismaClient
    ) {
        try {
            let conn = tx ?? prismaClient;

            const emailCampaign = await conn.emailCampaign.create({
                data: {
                    ...isEmailCampaignDataValidToCreate({
                        name,
                        smtp_server_id,
                    }),
                    total_leads: 0,
                    click_rate: 0,
                    open_rate: 0,
                    status: EEmailCampaignStatus.draft,
                }
            });

            return emailCampaign;
        } catch (err) {
            throw new RepositoryException('Error creating email campaign', err);
        }
    }

    async update(id: number, data: {
        name?: string;
        smtp_server_id?: number;
        total_leads?: number;
        click_rate?: number;
        open_rate?: number;
        status?: EEmailCampaignStatus;
    }, prisma?: PrismaClient) {
        try {
            const conn = prisma ?? prismaClient;
            const emailCampaign = await conn.emailCampaign.update({ where: { id }, data });

            return emailCampaign;
        } catch (err) {
            throw new RepositoryException('Error updating email campaign', err);
        }
    }

    async updateMainEmail(id: number, main_email_id: number, tx?: PrismaClient) {
        try {
            const conn = tx ?? prismaClient;

            const emailCampaign = await conn.emailCampaign.update({
                where: { id },
                data: {
                    main_email_id: main_email_id
                }
            });

            return emailCampaign;
        } catch (err) {
            throw new RepositoryException('Error updating primary copy variant', err);
        }
    }

    async updateTotalLeads(id: number, totalLeads: number) {
        try {
            const emailCampaign = await prismaClient.emailCampaign.update({
                where: { id },
                data: {
                    total_leads: totalLeads,
                    uploaded_leads: true
                }
            });

            return emailCampaign;
        } catch (err) {
            throw new RepositoryException('Error updating total leads', err);
        }
    }

    async updateCopyVariant(id: number, copy_variation_type: ECopyVariationType) {
        try {
            const emailCampaign = await prismaClient.emailCampaign.update({
                where: { id },
                data: {
                    copy_variation_type
                }
            });

            return emailCampaign;
        } catch (err) {
            throw new RepositoryException('Error updating copy variant', err);
        }
    }

    async updateCampaignBatchSize(id: number, campaign_batch_size: number) {
        try {
            const emailCampaign = await prismaClient.emailCampaign.update({
                where: { id },
                data: {
                    campaign_batch_size
                }
            });

            return emailCampaign;
        } catch (err) {
            throw new RepositoryException('Error updating campaign batch size', err);
        }
    }

    async selectById(id: number) {
        try {
            const emailCampaign = await prismaClient.emailCampaign.findUnique({
                where: { id }
            });

            return emailCampaign;
        } catch (err) {
            throw new RepositoryException('Error selecting email campaign by id', err);
        }
    }

    async find({ page = 1, limit = 10, where = {} }: { page?: number, limit?: number, where?: Prisma.EmailCampaignWhereInput }) {
        try {
            const emailCampaigns = await prismaClient.emailCampaign.findMany({
                skip: (page - 1) * limit,
                take: limit,
                where,
            });
            const count = await prismaClient.emailCampaign.count({
                where,
            });
            return {
                raws: emailCampaigns,
                count,
            };
        } catch (err) {
            throw new RepositoryException('Error selecting all email campaigns', err);
        }
    }
}
