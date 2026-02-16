import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ZarpAuthModule } from '@/modules/zarp-auth/zarp-auth.module';
import {
  EMAIL_CAMPAIGN_REPOSITORY,
  SMTP_SERVER_REPOSITORY,
} from './domain/interfaces';
import {
  PrismaEmailCampaignRepository,
  PrismaSMTPServerRepository,
} from './infrastructure/repositories';

// Application Services
import { EmailCampaignService } from './application/services/email-campaign.service';
import { ConfigService } from './application/services/config.service';
import { EventNotificationService } from './application/services/event-notification.service';
import { LeadService } from './application/services/lead.service';
import { EmailCampaignBatchService } from './application/services/email-campaign-batch.service';

// Controllers
import { EmailCampaignController } from './infrastructure/controllers/email-campaign.controller';
import { ConfigController } from './infrastructure/controllers/config.controller';
import { EventNotificationController } from './infrastructure/controllers/event-notification.controller';
import { LeadController } from './infrastructure/controllers/lead.controller';

// Processor (BullMQ)
import { EmailCampaignProcess } from './infrastructure/processors/email-campaign.processor';

// Legacy repositories (will be replaced by DIP interfaces incrementally)
import EmailCampaignRepository from './infrastructure/repositories/email-campaign-legacy.repository';
import CampaignBatchRepository from './infrastructure/repositories/campaign-batch.repository';
import { DeliveryRepository } from './infrastructure/repositories/delivery.repository';
import SMTPServerRepository from './infrastructure/repositories/smtp-server-legacy.repository';
import EmailLeadRepository from './infrastructure/repositories/email-lead.repository';
import EmailRepository from './infrastructure/repositories/email.repository';
import SMSNotificationRepository from './infrastructure/repositories/sms-notification.repository';
import SMSNotificationEventRepository from './infrastructure/repositories/sms-notification-event.repository';
import ConfigRepository from './infrastructure/repositories/config.repository';

// Cross-context (temporary coupling)
import LeadRepository from '@/modules/zarp-auth/infrastructure/repositories/lead.repository';
import { AWSSMSProvider } from '@/modules/zarp-mailer/infrastructure/providers/aws-sms.provider';
import { EncryptProvider } from '@/shared/providers/encrypt.provider';

/**
 * Zarp Mailer Module
 * Bounded context for email campaign management, SMS notifications,
 * lead management, and SMTP configuration
 *
 * Implements:
 * - Email campaign CRUD & batch processing
 * - Campaign delivery tracking
 * - SMTP server configuration
 * - SMS event notifications (AWS SNS)
 * - Lead management
 */
@Module({
  imports: [
    ZarpAuthModule,
    BullModule.registerQueue({
      name: 'email-campaign-queue',
    }),
  ],
  controllers: [
    EmailCampaignController,
    ConfigController,
    EventNotificationController,
    LeadController,
  ],
  providers: [
    // Application Services
    EmailCampaignService,
    ConfigService,
    EventNotificationService,
    LeadService,
    EmailCampaignBatchService,

    // Processor (BullMQ)
    EmailCampaignProcess,

    // Repositories (DIP - Dependency Inversion)
    {
      provide: EMAIL_CAMPAIGN_REPOSITORY,
      useClass: PrismaEmailCampaignRepository,
    },
    {
      provide: SMTP_SERVER_REPOSITORY,
      useClass: PrismaSMTPServerRepository,
    },

    // Legacy repositories
    EmailCampaignRepository,
    CampaignBatchRepository,
    DeliveryRepository,
    SMTPServerRepository,
    EmailLeadRepository,
    EmailRepository,
    SMSNotificationRepository,
    SMSNotificationEventRepository,
    ConfigRepository,

    // Cross-context (temporary coupling)
    LeadRepository,
    AWSSMSProvider,
  ],
  exports: [
    EmailCampaignService,
    EMAIL_CAMPAIGN_REPOSITORY,
    SMTP_SERVER_REPOSITORY,
  ],
})
export class ZarpMailerModule {}
