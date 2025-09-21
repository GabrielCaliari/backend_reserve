import { PrismaClient } from "@prisma/client";
import RepositoryException from "src/core/exceptions/RepositoryException";
import prismaClient from "src/core/database/prisma/prismaClient";

export interface IBrandNotification {
    id?: number;
    user_id: number;
    brand_id: number;
    brand_monitoring_id: number;
}

export default class BrandNotificationRepository {
    async create(data: Omit<IBrandNotification, 'id'>, rx?: PrismaClient) {
        try {
            const connection = rx ?? prismaClient;

            const raw = await connection.brandNotification.create({
                data: {
                    brand_id: data.brand_id,
                    brand_monitoring_id: data.brand_monitoring_id,
                    user_id: data.user_id
                }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao criar uma notificação de marca.', error);
        }
    }
}