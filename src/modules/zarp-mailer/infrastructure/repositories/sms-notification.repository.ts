import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { RepositoryException } from '@/shared/exceptions';
import { REPOSITORY_CREATE_SMS_NOTIFICATION_ERROR, REPOSITORY_SELECT_ALL_SMS_NOTIFICATION_ERROR, REPOSITORY_SELECT_BY_ID_SMS_NOTIFICATION_ERROR, REPOSITORY_SELECT_BY_WEBHOOK_SMS_NOTIFICATION_ERROR } from "@/modules/zarp-mailer/domain/constants";
import { randomUUID } from "crypto";
import { SMSNotification } from "@/modules/zarp-mailer/domain/entities/sms-notification.entity";
import { PrismaClient } from "../../../../generated/prisma/client";

@Injectable()
export default class SMSNotificationRepository {
    constructor(private readonly prisma: PrismaService) {}
    async create(data: SMSNotification, tx?: PrismaClient) {
        try {
            const conn = tx ?? this.prisma;
            
            const result = await conn.sMSNotification.create({
                data: {
                    webhook: randomUUID(),
                    name: data.name,
                    total_notifications: data.total_notifications,
                }
            });

            return result ? new SMSNotification({
                id: result.id,
                name: result.name,
                total_notifications: result.total_notifications,
                webhook: result.webhook,
                created_at: result.created_at,
                updated_at: result.updated_at
            }) : null;
        } catch (err) {
            throw new RepositoryException(REPOSITORY_CREATE_SMS_NOTIFICATION_ERROR, err);
        }
    }

    async selectAll(page: number = 1, perPage: number = 1000) {
        try {
            const result = await this.prisma.sMSNotification.findMany({
                orderBy: {
                    id: 'desc'
                },
                skip: (page - 1) * perPage,
                take: perPage,
            });

            return result.map(raw => {
                return new SMSNotification({
                    id: raw.id,
                    webhook: raw.webhook,
                    name: raw.name,
                    total_notifications: raw.total_notifications,
                    created_at: raw.created_at,
                    updated_at: raw.updated_at,
                })
            });
        } catch (err) {
            throw new RepositoryException(REPOSITORY_SELECT_ALL_SMS_NOTIFICATION_ERROR, err);
        }
    }

    async selectById(id: number) {
        try {
            const result = await this.prisma.sMSNotification.findUnique({
                where: {
                    id
                }
            });

            return result ? new SMSNotification({
                id: result.id,
                webhook: result.webhook,
                name: result.name,
                total_notifications: result.total_notifications,
                created_at: result.created_at,
                updated_at: result.updated_at,
            }) : null;
        } catch (err) {
            throw new RepositoryException(REPOSITORY_SELECT_BY_ID_SMS_NOTIFICATION_ERROR, err);
        }
    }

    async selectByWebhook(webhook: string) {
        try {
            const result = await this.prisma.sMSNotification.findUnique({
                where: {
                    webhook
                }
            });

            return result ? new SMSNotification({
                id: result.id,
                webhook: result.webhook,
                name: result.name,
                total_notifications: result.total_notifications,
                created_at: result.created_at,
                updated_at: result.updated_at,
            }) : null;
        } catch (err) {
            throw new RepositoryException(REPOSITORY_SELECT_BY_WEBHOOK_SMS_NOTIFICATION_ERROR, err);
        }
    }
}