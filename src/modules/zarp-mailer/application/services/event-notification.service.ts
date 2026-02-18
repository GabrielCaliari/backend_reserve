import { Injectable } from '@nestjs/common';
import SMSNotificationRepository from '@/modules/zarp-mailer/infrastructure/repositories/sms-notification.repository';
import { CreateEventNotificationDTO, CreateEventNotificationEventDTO, CreateEventNotificationEventParam, IdEventNotificationEventParam, IdNotificationEventNotificationEventParam } from '../dtos/event-notification.dto';
import { errorResponse, renderTemplate, successResponse } from '@/shared/helpers';
import { ERROR_CREATE_SMS_NOTIFICATION, ERROR_CREATE_SMS_NOTIFICATION_EVENT_NOTIFICATION_NOT_FOUND, ERROR_FIND_BY_ID_NOTIFICATION_SMS_NOTIFICATION, ERROR_FIND_BY_ID_SMS_NOTIFICATION, ERROR_FIND_SMS_NOTIFICATION } from '@/modules/zarp-mailer/domain/constants';
import { SMSNotification } from '@/modules/zarp-mailer/domain/entities/sms-notification.entity';
import SMSNotificationEvent, { ESMSNotificationEventStatus, ESMSProvider } from '@/modules/zarp-mailer/domain/entities/sms-notification-event.entity';
import PhoneNumber from '@/shared/domain/value-objects/phone-number.vo';
import countryCode from '@/shared/data/country-code';

import SMSNotificationEventRepository from '@/modules/zarp-mailer/infrastructure/repositories/sms-notification-event.repository';
import { PrismaClient } from "../../../../generated/prisma/client";
import { AWSSMSProvider } from '@/modules/zarp-mailer/infrastructure/providers/aws-sms.provider';
import { PrismaService } from '@/shared/database/prisma.service';

@Injectable()
export class EventNotificationService {
    constructor(
        private readonly smsNotificationRepository: SMSNotificationRepository,
        private readonly smsNotificationEventRepository: SMSNotificationEventRepository,
        private readonly awsSNSProvider: AWSSMSProvider,
        private readonly prisma: PrismaService,
    ) { }

    async createSMSNotification(data: CreateEventNotificationDTO) {
        try {
            const smsNotification = await this.smsNotificationRepository.create(
                new SMSNotification({
                    name: data.name,
                    total_notifications: 0
                })
            );

            return successResponse({
                id: smsNotification.id,
                name: smsNotification.name,
                webhook: smsNotification.webhook,
            });
        } catch (err) {
            return errorResponse(ERROR_CREATE_SMS_NOTIFICATION, 500, err);
        }
    }

    async findSMSNotification() {
        try {
            const smsNotifications = await this.smsNotificationRepository.selectAll();

            return successResponse(smsNotifications.map(raw => {
                return {
                    id: raw.id,
                    name: raw.name,
                    webhook: raw.webhook,
                    total_notifications: raw.total_notifications,
                }
            }));
        } catch (err) {
            return errorResponse(ERROR_FIND_SMS_NOTIFICATION, 500, err);
        }
    }

    async findByIdSMSNotification({ id }: IdEventNotificationEventParam) {
        try {
            const smsNotifications = await this.smsNotificationRepository.selectById(+id);

            if (!smsNotifications) {
                return errorResponse(ERROR_FIND_BY_ID_SMS_NOTIFICATION, 404, 'NÃ£o foi possÃ­vel encontrar nenhum SMS notification com o ID informado.');
            }

            return successResponse({
                id: smsNotifications.id,
                name: smsNotifications.name,
                webhook: smsNotifications.webhook,
                total_notifications: smsNotifications.total_notifications,
            });
        } catch (err) {
            return errorResponse(ERROR_FIND_BY_ID_SMS_NOTIFICATION, 500, err);
        }
    }

    async createSMSNotificationEvent(data: CreateEventNotificationEventDTO & CreateEventNotificationEventParam) {
        try {
            const smsNotification = await this.smsNotificationRepository.selectByWebhook(data.uuid);

            if (!smsNotification) {
                return errorResponse(
                    ERROR_CREATE_SMS_NOTIFICATION_EVENT_NOTIFICATION_NOT_FOUND,
                    404,
                    'NÃ£o foi possÃ­vel encontrar nenhum SMS notification com o webhook informado.'
                );
            }

            const message = renderTemplate(data.message, data.message_params as Record<string, unknown>);
            const SenderNumber = new PhoneNumber(data.sender_number);
            const DestinationNumber = new PhoneNumber(data.destination_number);

            const smsNotificationEvent = new SMSNotificationEvent({
                destination_country: countryCode[DestinationNumber.getCountry().toLocaleLowerCase()] ?? countryCode.none,
                destination_number: DestinationNumber,
                sender_number: SenderNumber,
                message: message,
                sms_provider: ESMSProvider.awsSNS,
                status: ESMSNotificationEventStatus.pending,
                sms_notification_id: smsNotification.id,
                payload_message: data.message_params,

            })

            const result = await this.prisma.$transaction(async (tx: PrismaClient) => {
                const snsResponse = await this.awsSNSProvider.execute({
                    phone_number: smsNotificationEvent.destination_number.toString(),
                    message: message,
                }).catch(err => {
                    return {
                        error: true,
                        err
                    }
                });

                if ((snsResponse as any).error) {
                    const smsResponse = await this.smsNotificationEventRepository.create({
                        ...smsNotificationEvent,
                        status: ESMSNotificationEventStatus.failed,
                        payload_provider_response: snsResponse
                    }, tx);

                    throw (snsResponse as any).err;
                }

                const smsResponse = await this.smsNotificationEventRepository.create({
                    ...smsNotificationEvent,
                    status: ESMSNotificationEventStatus.sent,
                    payload_provider_response: snsResponse
                }, tx);

                return {
                    id: smsResponse.id
                }
            })

            return successResponse({
                id: result.id
            });
        } catch (err) {
            return errorResponse(ERROR_CREATE_SMS_NOTIFICATION, 500, err);
        }
    }

    async findByIdNotificationSMSNotificationEvent({ id_notification }: IdNotificationEventNotificationEventParam) {
        try {
            const events = await this.smsNotificationEventRepository.selectBySMSNotification(+id_notification);

            return successResponse(events.map(raw => {
                return {
                    id: raw.id,
                    message: raw.message,
                    destination_number: raw.destination_number.toString(),
                    sender_number: raw.sender_number.toString(),
                    destination_country: raw.destination_country,
                    sms_provider: raw.sms_provider,
                    payload_provider_response: raw.payload_provider_response,
                    payload_message: raw.payload_message,
                    status: raw.status,
                    sms_notification_id: raw.sms_notification_id,
                    created_at: raw.created_at,
                    updated_at: raw.updated_at,
                }
            }))
        } catch (err) {
            return errorResponse(ERROR_FIND_BY_ID_NOTIFICATION_SMS_NOTIFICATION, 500, err);
        }
    }
}
