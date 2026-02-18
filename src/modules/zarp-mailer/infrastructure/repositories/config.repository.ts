import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';

@Injectable()
export default class ConfigRepository {
    constructor(private readonly prisma: PrismaService) {}
    async findAll() {
        try {
            const config = await this.prisma.config.findMany();
            return config;
        } catch (err) {
            throw new RepositoryException('Error selecting all configs', err);
        }
    }

    async findByName(name: string) {
        try {
            const config = await this.prisma.config.findUnique({
                where: { name }
            });
            return config;
        } catch (err) {
            throw new RepositoryException('Error selecting config by name', err);
        }
    }
}

