export * from './campaign-batch-status.enum';
export * from './delivery-status.enum';
export * from './email-type.enum';
export * from './email-campaign.enum';
export * from './smtp-provider.enum';
export * from './event-notification.type';

/**
 * Email Campaign Status Enum
 * Represents the lifecycle states of an email campaign
 */
export enum EmailCampaignStatus {
  DRAFT = 0,
  PENDING = 1,
  SCHEDULED = 2,
  SENT = 3,
  FAILED = 4,
  ARCHIVED = 5,
  PAUSED = 8,
}

/**
 * Copy Variation Type Enum
 * Defines how email copy variations are generated
 */
export enum CopyVariationType {
  AI = 1,
  MANUAL = 2,
}

/**
 * Campaign Batch Status Enum
 * Represents the status of a batch segment
 */
export enum CampaignBatchStatus {
  PENDING = 0,
  PROCESSING = 1,
  COMPLETED = 2,
  FAILED = 3,
  PAUSED = 4,
}

/**
 * Delivery Status Enum
 * Represents the delivery status of individual emails
 */
export enum DeliveryStatus {
  PENDING = 0,
  SENT = 1,
  DELIVERED = 2,
  FAILED = 3,
  BOUNCED = 4,
  OPENED = 5,
  CLICKED = 6,
}

/**
 * Lead Status Enum
 * Represents the status of email leads
 */
export enum LeadStatus {
  ACTIVE = 1,
  INACTIVE = 0,
  BOUNCED = 2,
  UNSUBSCRIBED = 3,
}
