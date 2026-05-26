import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import {
  NOTIFICATION_REPOSITORY,
  INotificationRepository,
  NOTIFICATION_RECEIPT_REPOSITORY,
  INotificationReceiptRepository,
} from '../../domain/interfaces';
import { NotificationSettingsService } from './notification-settings.service';
import { ENotificationType } from '../../domain/enums';
import { CreateNotificationDTO } from '../dtos/create-notification.dto';
import { UpdateNotificationDTO } from '../dtos/update-notification.dto';
import { ListNotificationsQueryDTO } from '../dtos/list-notifications-query.dto';

@Injectable()
export class NotificationService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifRepo: INotificationRepository,
    @Inject(NOTIFICATION_RECEIPT_REPOSITORY)
    private readonly receiptRepo: INotificationReceiptRepository,
    private readonly settingsService: NotificationSettingsService,
  ) {}

  async create(dto: CreateNotificationDTO, adminId: string) {
    return this.notifRepo.create({
      title: dto.title,
      body: dto.body,
      type: dto.type ?? ENotificationType.manual,
      scope: dto.scope,
      tenant_ids: dto.tenant_ids ?? [],
      send_email: dto.send_email ?? false,
      scheduled_at: dto.scheduled_at ? new Date(dto.scheduled_at) : undefined,
      created_by: adminId,
    });
  }

  async publish(id: string) {
    const notif = await this.notifRepo.findById(id);
    if (!notif) throw new NotFoundException('Notification not found');
    if (notif.published_at) throw new ConflictException('Notification already published');

    const published = await this.notifRepo.publish(id);

    const targetTenantIds: string[] =
      notif.scope === 'broadcast'
        ? await this.notifRepo.findAllActiveTenantIds()
        : notif.tenant_ids;

    await this.receiptRepo.createManyForTenant(id, targetTenantIds);

    return published;
  }

  async update(id: string, dto: UpdateNotificationDTO) {
    const notif = await this.notifRepo.findById(id);
    if (!notif) throw new NotFoundException('Notification not found');
    if (notif.published_at) throw new ConflictException('Cannot edit a published notification');
    return this.notifRepo.update(id, {
      ...dto,
      scheduled_at: dto.scheduled_at ? new Date(dto.scheduled_at) : undefined,
    });
  }

  async delete(id: string) {
    const notif = await this.notifRepo.findById(id);
    if (!notif) throw new NotFoundException('Notification not found');
    if (notif.published_at) throw new ConflictException('Cannot delete a published notification');
    await this.notifRepo.delete(id);
  }

  async list(query: ListNotificationsQueryDTO) {
    return this.notifRepo.findAll({
      type: query.type,
      scope: query.scope,
      published: query.published,
      page: query.page,
      limit: query.limit,
    });
  }

  async findById(id: string) {
    const notif = await this.notifRepo.findById(id);
    if (!notif) throw new NotFoundException('Notification not found');
    return notif;
  }
}
