import { Module } from "@nestjs/common";
import { EmailCampaignService } from "./email-campaign.service";
import { EmailCampaignController } from "./email-campaign.controller";
import { EmailCampaignProcess } from "./email-campaign.process";
import EmailCampaignRepository from "src/core/database/repository/email-campaign.repository";
import CampaignBatchRepository from "src/core/database/repository/campaign-batch.repository";
import { DeliveryRepository } from "src/core/database/repository/delivery.repository";
import SMTPServerRepository from "src/core/database/repository/smtp-server.repository";
import AESEncrypt from "src/core/providers/AESEncrypt";
import EmailLeadRepository from "src/core/database/repository/email-lead.repository";
import EmailRepository from "src/core/database/repository/email.repository";
import { BullModule } from "@nestjs/bull";
import { env } from "src/core/functions";

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'email-campaign-queue',
        }),
    ],
    controllers: [
        EmailCampaignController
    ],
    providers: [
        EmailCampaignProcess,
        EmailCampaignService,
        EmailCampaignRepository,
        CampaignBatchRepository,
        DeliveryRepository,
        SMTPServerRepository,
        EmailLeadRepository,
        EmailRepository,
        AESEncrypt,
    ]
})
export class EmailCampaignModule { }