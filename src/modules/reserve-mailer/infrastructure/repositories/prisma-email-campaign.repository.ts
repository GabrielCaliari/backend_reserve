import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import {
  IEmailCampaignRepository,
  PaginationParams,
  PaginatedResult,
} from '../../domain/interfaces';
import { EmailCampaign } from '../../domain/entities';
import { EmailCampaignStatus } from '../../domain/enums';

/**
 * Prisma implementation of Email Campaign Repository
 * Infrastructure layer - implements domain interface
 */
@Injectable()
export class PrismaEmailCampaignRepository implements IEmailCampaignRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(campaign: Partial<EmailCampaign>): Promise<EmailCampaign> {
    try {
      const result = await this.prisma.emailCampaign.create({
        data: {
          name: campaign.name,
          status: campaign.status ?? EmailCampaignStatus.DRAFT,
          smtp_server_id: campaign.smtpServerId,
          copy_variation_type: campaign.copyVariationType ?? 1,
          campaign_batch_size: campaign.campaignBatchSize?.getValue() ?? 100,
          total_leads: 0,
          click_rate: 0,
          open_rate: 0,
          uploaded_leads: false,
        },
      });

      return EmailCampaign.fromPersistence(result);
    } catch (error) {
      throw new RepositoryException('Error creating email campaign', 'EMAIL_CAMPAIGN_CREATE_ERROR', error);
    }
  }

  async findById(id: string): Promise<EmailCampaign | null> {
    try {
      const result = await this.prisma.emailCampaign.findUnique({
        where: { id },
        include: {
          smtp_server: {
            select: {
              id: true,
              name: true,
              email: true,
              domain: true,
            },
          },
        },
      });

      if (!result) return null;

      return EmailCampaign.fromPersistence(result);
    } catch (error) {
      throw new RepositoryException('Error finding email campaign by id', 'EMAIL_CAMPAIGN_FIND_ERROR', error);
    }
  }

  async findAll(pagination: PaginationParams): Promise<PaginatedResult<EmailCampaign>> {
    try {
      const skip = (pagination.page - 1) * pagination.limit;

      const [data, count] = await Promise.all([
        this.prisma.emailCampaign.findMany({
          skip,
          take: pagination.limit,
          orderBy: { created_at: 'desc' },
          include: {
            smtp_server: {
              select: {
                id: true,
                name: true,
                email: true,
                domain: true,
              },
            },
          },
        }),
        this.prisma.emailCampaign.count(),
      ]);

      return {
        data: data.map((item) => EmailCampaign.fromPersistence(item)),
        count,
        currentPage: pagination.page,
        totalPages: Math.ceil(count / pagination.limit),
        limit: pagination.limit,
      };
    } catch (error) {
      throw new RepositoryException('Error finding email campaigns', 'EMAIL_CAMPAIGN_LIST_ERROR', error);
    }
  }

  async update(id: string, data: Partial<EmailCampaign>): Promise<EmailCampaign> {
    try {
      const updateData: any = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.copyVariationType !== undefined) updateData.copy_variation_type = data.copyVariationType;
      if (data.campaignBatchSize !== undefined) updateData.campaign_batch_size = data.campaignBatchSize.getValue();
      if (data.updatedAt !== undefined) updateData.updated_at = data.updatedAt;

      const result = await this.prisma.emailCampaign.update({
        where: { id },
        data: updateData,
      });

      return EmailCampaign.fromPersistence(result);
    } catch (error) {
      throw new RepositoryException('Error updating email campaign', 'EMAIL_CAMPAIGN_UPDATE_ERROR', error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.emailCampaign.delete({
        where: { id },
      });
    } catch (error) {
      throw new RepositoryException('Error deleting email campaign', 'EMAIL_CAMPAIGN_DELETE_ERROR', error);
    }
  }
}
