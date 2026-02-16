import { EmailCampaign } from '../entities';

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  currentPage: number;
  totalPages: number;
  limit: number;
}

/**
 * Repository interface for Email Campaign
 * Infrastructure layer must implement this contract
 */
export interface IEmailCampaignRepository {
  create(campaign: Partial<EmailCampaign>): Promise<EmailCampaign>;
  findById(id: number): Promise<EmailCampaign | null>;
  findAll(pagination: PaginationParams): Promise<PaginatedResult<EmailCampaign>>;
  update(id: number, data: Partial<EmailCampaign>): Promise<EmailCampaign>;
  delete(id: number): Promise<void>;
}

export const EMAIL_CAMPAIGN_REPOSITORY = Symbol('EMAIL_CAMPAIGN_REPOSITORY');
