import SMSNotificationEvent from "@/modules/zarp-mailer/domain/entities/sms-notification-event.entity";
import {
    REPOSITORY_CREATE_SMS_NOTIFICATION_EVENT_ERROR,
    REPOSITORY_SELECT_BY_ID_SMS_NOTIFICATION_EVENT_ERROR,
    REPOSITORY_SELECT_EVENT_BY_SMS_NOTIFICATION_EVENT_ERROR
} from "@/modules/zarp-mailer/domain/constants";
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { RepositoryException } from '@/shared/exceptions';
import PhoneNumber from "@/shared/domain/value-objects/phone-number.vo";
import { PrismaClient } from "../../../../generated/prisma/client";

@Injectable()
export default class SMSNotificationEventRepository {
    constructor(private readonly prisma: PrismaService) {}
    async create(data: SMSNotificationEvent, tx?: PrismaClient) {
        try {
            const  conn = tx ?? this.prisma;
            
            const result = await conn.sMSNotificationEvent.create({
                data: {
                    destination_country: data.destination_country,
                    destination_number: data.destination_number.toString(),
                    message: data.message,
                    sender_number: data.sender_number.toString(),
                    sms_provider: data.sms_provider,
                    status: data.status,
                    sms_notification_id: data.sms_notification_id as number,
                    ...(data.payload_message ? { payload_message: JSON.parse(JSON.stringify(data.payload_message)) } : {}),
                    ...(data.payload_provider_response ? { payload_provider_response: JSON.parse(JSON.stringify(data.payload_provider_response)) } : {}),
                }
            });
            return result;
        } catch (err) {
            throw new RepositoryException(REPOSITORY_CREATE_SMS_NOTIFICATION_EVENT_ERROR, err);
        }
    }

    async selectById(id: number) {
        try {
            const result = await this.prisma.sMSNotificationEvent.findUnique({
                where: {
                    id
                }
            });

            return result ? new SMSNotificationEvent({
                id: result.id,
                destination_country: result.destination_country,
                destination_number: new PhoneNumber(result.destination_number),
                message: result.message,
                sender_number: new PhoneNumber(result.sender_number),
                sms_provider: result.sms_provider,
                status: result.status,
                sms_notification_id: result.sms_notification_id,
                ...(result.payload_message ? { payload_message: result.payload_message } : {}),
                ...(result.payload_provider_response ? { payload_provider_response: result.payload_provider_response } : {}),
                created_at: result.created_at,
                updated_at: result.updated_at
            }) : null;
        } catch (err) {
            throw new RepositoryException(REPOSITORY_SELECT_BY_ID_SMS_NOTIFICATION_EVENT_ERROR, err);
        }
    }

    async selectBySMSNotification(SMSnotification_id: number) {
        try {
            const result = await this.prisma.sMSNotificationEvent.findMany({
                where: {
                    sms_notification_id: SMSnotification_id,
                },
                orderBy: {
                    id: 'desc'
                }
            });

            return result.map(event => new SMSNotificationEvent({
                id: event.id,
                destination_country: event.destination_country,
                destination_number: new PhoneNumber(event.destination_number),
                message: event.message,
                sender_number: new PhoneNumber(event.sender_number),
                sms_provider: event.sms_provider,
                status: event.status,
                sms_notification_id: event.sms_notification_id,
                ...(event.payload_message ? { payload_message: event.payload_message } : {}),
                ...(event.payload_provider_response ? { payload_provider_response: event.payload_provider_response } : {}),
                created_at: event.created_at,
                updated_at: event.updated_at
            }));
        } catch (err) {
            throw new RepositoryException(REPOSITORY_SELECT_EVENT_BY_SMS_NOTIFICATION_EVENT_ERROR, err);
        }
    }
}