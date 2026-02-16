import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  IEmailCampaignRepository,
  EMAIL_CAMPAIGN_REPOSITORY,
  ISMTPServerRepository,
  SMTP_SERVER_REPOSITORY,
} from '@/modules/zarp-mailer/domain/interfaces';
import { EmailCampaign } from '@/modules/zarp-mailer/domain/entities';
import { BatchSize } from '@/modules/zarp-mailer/domain/value-objects';
import { CopyVariationType, EmailCampaignStatus } from '@/modules/zarp-mailer/domain/enums';
import { DomainException } from '@/shared/exceptions';

/**
 * Email Campaign Service
 * Application layer - orchestrates business operations
 */
@Injectable()
export class EmailCampaignService {
  constructor(
    @Inject(EMAIL_CAMPAIGN_REPOSITORY)
    private readonly campaignRepository: IEmailCampaignRepository,
    @Inject(SMTP_SERVER_REPOSITORY)
    private readonly smtpServerRepository: ISMTPServerRepository,
  ) {}

  /**
   * Create a new draft email campaign
   */
  async createEmailCampaign(name: string) {
    const smtpServer = await this.smtpServerRepository.findDefault();

    if (!smtpServer) {
      throw new NotFoundException('Default SMTP server not found');
    }

    const campaignData = EmailCampaign.createDraft(name, smtpServer.id);
    const campaign = await this.campaignRepository.create(campaignData);

    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      created_at: campaign.createdAt,
    };
  }

  /**
   * Find all email campaigns with pagination
   */
  async findEmailCampaigns(page: number = 1, limit: number = 30) {
    const result = await this.campaignRepository.findAll({ page, limit });

    return {
      email_campaigns: result.data.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        copy_variation_type: campaign.copyVariationType,
        campaign_batch_size: campaign.campaignBatchSize.getValue(),
        created_at: campaign.createdAt,
        updated_at: campaign.updatedAt,
      })),
      page: {
        count: result.count,
        count_pages: result.totalPages,
        current_page: result.currentPage,
        limit: result.limit,
      },
    };
  }

  /**
   * Find email campaign by ID
   */
  async getEmailCampaignById(id: number) {
    const campaign = await this.campaignRepository.findById(id);

    if (!campaign) {
      throw new NotFoundException(`Email campaign with ID ${id} not found`);
    }

    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      smtp_server_id: campaign.smtpServerId,
      copy_variation_type: campaign.copyVariationType,
      campaign_batch_size: campaign.campaignBatchSize.getValue(),
      created_at: campaign.createdAt,
      updated_at: campaign.updatedAt,
    };
  }

  /**
   * Update copy variation type
   */
  async updateCopyVariationType(id: number, copyVariationType: CopyVariationType) {
    const campaign = await this.campaignRepository.findById(id);

    if (!campaign) {
      throw new NotFoundException(`Email campaign with ID ${id} not found`);
    }

    try {
      campaign.updateCopyVariationType(copyVariationType);
      await this.campaignRepository.update(id, campaign);

      return {
        id: campaign.id,
        copy_variation_type: campaign.copyVariationType,
      };
    } catch (error) {
      if (error instanceof DomainException) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * Update campaign batch size
   */
  async updateCampaignBatchSize(id: number, size: number) {
    const campaign = await this.campaignRepository.findById(id);

    if (!campaign) {
      throw new NotFoundException(`Email campaign with ID ${id} not found`);
    }

    try {
      const batchSize = new BatchSize(size);
      campaign.updateBatchSize(batchSize);
      await this.campaignRepository.update(id, campaign);

      return {
        id: campaign.id,
        campaign_batch_size: campaign.campaignBatchSize.getValue(),
      };
    } catch (error) {
      if (error instanceof DomainException) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * Close campaign setup
   */
  async closeSetup(id: number) {
    const campaign = await this.campaignRepository.findById(id);

    if (!campaign) {
      throw new NotFoundException(`Email campaign with ID ${id} not found`);
    }

    try {
      campaign.closeSetup();
      await this.campaignRepository.update(id, campaign);

      return {
        id: campaign.id,
        status: campaign.status,
      };
    } catch (error) {
      if (error instanceof DomainException) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(id: number) {
    const campaign = await this.campaignRepository.findById(id);

    if (!campaign) {
      throw new NotFoundException(`Email campaign with ID ${id} not found`);
    }

    try {
      campaign.pause();
      await this.campaignRepository.update(id, campaign);

      return {
        id: campaign.id,
        status: campaign.status,
      };
    } catch (error) {
      if (error instanceof DomainException) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * Resume campaign
   */
  async resumeCampaign(id: number) {
    const campaign = await this.campaignRepository.findById(id);

    if (!campaign) {
      throw new NotFoundException(`Email campaign with ID ${id} not found`);
    }

    try {
      campaign.resume();
      await this.campaignRepository.update(id, campaign);

      return {
        id: campaign.id,
        status: campaign.status,
      };
    } catch (error) {
      if (error instanceof DomainException) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
