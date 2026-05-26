import { Module } from '@nestjs/common';
import { NotificationService } from './application/services/notification.service';
import { NotificationTenantService } from './application/services/notification-tenant.service';
import { NotificationSettingsService } from './application/services/notification-settings.service';
import { NotificationEventService } from './application/services/notification-event.service';
import { NotificationSchedulerService } from './application/services/notification-scheduler.service';
import { NotificationController } from './infrastructure/controllers/notification.controller';
import { NotificationTenantController } from './infrastructure/controllers/notification-tenant.controller';
import { NotificationSettingsController } from './infrastructure/controllers/notification-settings.controller';
import { NotificationRepository } from './infrastructure/repositories/notification.repository';
import { NotificationReceiptRepository } from './infrastructure/repositories/notification-receipt.repository';
import { NotificationSettingsRepository } from './infrastructure/repositories/notification-settings.repository';
import {
  NOTIFICATION_REPOSITORY,
  NOTIFICATION_RECEIPT_REPOSITORY,
  NOTIFICATION_SETTINGS_REPOSITORY,
} from './domain/interfaces';
import { AdminJwtGuard, RolesGuard } from '../../shared/auth/guards';
import { ReserveAuthModule } from '../reserve-auth/reserve-auth.module';
import { DatabaseModule } from '../../shared/database/database.module';

@Module({
  imports: [ReserveAuthModule, DatabaseModule],
  controllers: [
    NotificationTenantController,
    NotificationSettingsController,
    NotificationController,
  ],
  providers: [
    NotificationService,
    NotificationTenantService,
    NotificationSettingsService,
    NotificationEventService,
    NotificationSchedulerService,
    NotificationRepository,
    NotificationReceiptRepository,
    NotificationSettingsRepository,
    { provide: NOTIFICATION_REPOSITORY, useExisting: NotificationRepository },
    { provide: NOTIFICATION_RECEIPT_REPOSITORY, useExisting: NotificationReceiptRepository },
    { provide: NOTIFICATION_SETTINGS_REPOSITORY, useExisting: NotificationSettingsRepository },
    AdminJwtGuard,
    RolesGuard,
  ],
  exports: [NotificationEventService, NotificationSettingsService],
})
export class ReserveNotificationsModule {}
