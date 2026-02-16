import { PrismaClient } from "@/generated/prisma/client";
import { EBrandMonitoring } from "@/@types/@brand-monitoring";
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { RepositoryException } from '@/shared/exceptions';

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

@Injectable()
export default class BrandMonitoringRepository {
    constructor(private readonly prisma: PrismaService) {}
    async create(data: Omit<IBrandMonitoring, 'id'>, rx?: PrismaClient) {
        try {
            const connection = rx ?? this.prisma;

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
            const connection = rx ?? this.prisma;

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