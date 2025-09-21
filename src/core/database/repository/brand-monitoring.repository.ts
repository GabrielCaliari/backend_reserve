import { PrismaClient } from "@prisma/client";
import { EBrandMonitoring } from "src/@types/@brand-monitoring";
import RepositoryException from "src/core/exceptions/RepositoryException";
import prismaClient from "src/core/database/prisma/prismaClient";

export interface IBrandMonitoring {
    id?: number;
    processed_last_analysis?: number;
    total_processed?: number;
    triggered_notifications?: number;
    status: EBrandMonitoring;
    user_id?: number;
    brand_id?: number;
    inpi_number?: string;
    last_magazine_searched?: string;
    last_movement?: Date;
    last_search?: Date;
    deposit?: Date;
}

export default class BrandMonitoringRepository {
    async create(data: Omit<IBrandMonitoring, 'id'>, rx?: PrismaClient) {
        try {
            const connection = rx ?? prismaClient;

            const raw = await connection.brandMonitoring.create({
                data: {
                    processed_last_analysis: data.processed_last_analysis,
                    total_processed: data.total_processed,
                    triggered_notifications: data.triggered_notifications,
                    status: data.status,
                    user_id: data.user_id,
                    brand_id: data.brand_id,
                    ...(data.inpi_number ? { inpi_number: data.inpi_number } : {}),
                    ...(data.last_magazine_searched ? { last_magazine_searched: data.last_magazine_searched } : {}),
                    ...(data.last_movement ? { last_movement: data.last_movement } : {}),
                    ...(data.last_search ? { last_search: data.last_search } : {}),
                }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao criar monitoramento de marca.', error);
        }
    }

    async update(data: IBrandMonitoring, rx?: PrismaClient) {
        try {
            const connection = rx ?? prismaClient;

            const raws = await connection.brandMonitoring.update({
                data: {
                    ...data
                },
                where: {
                    id: data.id
                }
            });
        } catch (error) {
            throw new RepositoryException('Erro ao criar monitoramento de marca.', error);
        }
    }
}