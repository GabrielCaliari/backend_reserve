import { PrismaClient } from "../../../../generated/prisma/client";
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';

export interface IBrandNotification {
    id?: string;
    user_id: string;
    brand_id: string;
    brand_monitoring_id: string;
}

@Injectable()
export default class BrandNotificationRepository {
    constructor(private readonly prisma: PrismaService) {}
    async create(data: Omit<IBrandNotification, 'id'>, rx?: PrismaClient) {
        try {
            const connection = rx ?? this.prisma;

            const raw = await connection.brandNotification.create({
                data: {
                    brand_id: data.brand_id,
                    brand_monitoring_id: data.brand_monitoring_id,
                    user_id: data.user_id
                }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao criar uma notificaÃ§Ã£o de marca.', error);
        }
    }
}