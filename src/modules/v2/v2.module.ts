import { Module } from '@nestjs/common';
import { EventNotificationModule } from './event-notification/event-notification.module';
import { LeadController } from './lead/lead.controller';
import { LeadService } from './lead/lead.service';
import { LeadModule } from './lead/lead.module';
import { EmailCampaignModule } from './email-campaign/email-campaign.module';

@Module({
    imports: [
        EventNotificationModule,
        LeadModule,
        EmailCampaignModule,
    ],
    controllers: [],
    providers: []
})
export class V2Module { }
