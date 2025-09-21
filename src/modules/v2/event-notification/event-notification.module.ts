import { Module } from '@nestjs/common';
import { EventNotificationController } from './event-notification.controller';
import { EventNotificationService } from './event-notification.service';
import SMSNotificationRepository from 'src/core/database/repository/sms-notification.repository';
import SMSNotificationEventRepository from 'src/core/database/repository/sms-notification-event.repository';
import AWSSMSProvider from 'src/core/providers/aws-sns/aws-sms.provider';
import { AdminValidateJwtTokenGuard } from 'src/common/guards/admin-validate-jwt-token/admin-validate-jwt-token.guard';
import { AdminService } from 'src/modules/v1/admin/admin.service';
import AdminRepository from 'src/core/database/repository/admin.repository';
import AdminCredentialRepository from 'src/core/database/repository/admin-credential.repository';
import AdminSessionTokenRepository from 'src/core/database/repository/admin-session-token.repository';

@Module({
    controllers: [
        EventNotificationController
    ],
    providers: [
        EventNotificationService,
        SMSNotificationRepository,
        SMSNotificationEventRepository,
        AWSSMSProvider,
        AdminValidateJwtTokenGuard,
        AdminService,
        AdminRepository,
        AdminCredentialRepository,
        AdminSessionTokenRepository
    ],
})
export class EventNotificationModule { }
