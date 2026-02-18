import { DomainException } from '../../../../shared/exceptions';
import { EmailCampaignStatus, CopyVariationType } from '../enums';
import { BatchSize } from '../value-objects';

/**
 * Email Campaign Entity
 * Represents an email marketing campaign with business rules
 */
export class EmailCampaign {
  private constructor(
    public readonly id: number,
    public name: string,
    public status: EmailCampaignStatus,
    public smtpServerId: number,
    public copyVariationType: CopyVariationType,
    public campaignBatchSize: BatchSize,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  /**
   * Factory method to create a new draft campaign
   */
  static createDraft(name: string, smtpServerId: number): Omit<EmailCampaign, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name,
      status: EmailCampaignStatus.DRAFT,
      smtpServerId,
      copyVariationType: CopyVariationType.AI,
      campaignBatchSize: new BatchSize(100), // Default batch size
    } as any;
  }

  /**
   * Factory method to reconstitute from database
   */
  static fromPersistence(data: {
    id: number;
    name: string;
    status: number;
    smtp_server_id: number;
    copy_variation_type: number;
    campaign_batch_size: number;
    created_at: Date;
    updated_at: Date;
  }): EmailCampaign {
    return new EmailCampaign(
      data.id,
      data.name,
      data.status as EmailCampaignStatus,
      data.smtp_server_id,
      data.copy_variation_type as CopyVariationType,
      new BatchSize(data.campaign_batch_size),
      data.created_at,
      data.updated_at,
    );
  }

  /**
   * Business rule: Can only close setup if campaign is in draft
   */
  canCloseSetup(): boolean {
    return this.status === EmailCampaignStatus.DRAFT;
  }

  /**
   * Business rule: Update copy variation type
   */
  updateCopyVariationType(type: CopyVariationType): void {
    if (!this.canCloseSetup()) {
      throw new DomainException(
        'Cannot update copy variation type after setup is closed',
        'CAMPAIGN_SETUP_CLOSED',
      );
    }
    this.copyVariationType = type;
    this.updatedAt = new Date();
  }

  /**
   * Business rule: Update batch size
   */
  updateBatchSize(size: BatchSize): void {
    if (!this.canCloseSetup()) {
      throw new DomainException(
        'Cannot update batch size after setup is closed',
        'CAMPAIGN_SETUP_CLOSED',
      );
    }
    this.campaignBatchSize = size;
    this.updatedAt = new Date();
  }

  /**
   * Business rule: Close setup and move to pending
   */
  closeSetup(): void {
    if (!this.canCloseSetup()) {
      throw new DomainException('Campaign setup is already closed', 'CAMPAIGN_SETUP_CLOSED');
    }
    this.status = EmailCampaignStatus.PENDING;
    this.updatedAt = new Date();
  }

  /**
   * Business rule: Pause campaign
   */
  pause(): void {
    if (this.status !== EmailCampaignStatus.PENDING && this.status !== EmailCampaignStatus.SCHEDULED) {
      throw new DomainException('Can only pause pending or scheduled campaigns', 'INVALID_STATUS_TRANSITION');
    }
    this.status = EmailCampaignStatus.PAUSED;
    this.updatedAt = new Date();
  }

  /**
   * Business rule: Resume campaign
   */
  resume(): void {
    if (this.status !== EmailCampaignStatus.PAUSED) {
      throw new DomainException('Can only resume paused campaigns', 'INVALID_STATUS_TRANSITION');
    }
    this.status = EmailCampaignStatus.PENDING;
    this.updatedAt = new Date();
  }

  /**
   * Convert to persistence format
   */
  toPersistence(): any {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      smtp_server_id: this.smtpServerId,
      copy_variation_type: this.copyVariationType,
      campaign_batch_size: this.campaignBatchSize.getValue(),
      updated_at: this.updatedAt,
    };
  }
}
