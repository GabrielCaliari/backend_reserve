import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { ICreateSmtpServer } from '../../domain/enums/smtp-provider.enum';
import { isSmtpServerDataValidToCreate } from '../../domain/validators/smtp-server.validator';

@Injectable()
export default class SMTPServerRepository {
    constructor(private readonly prisma: PrismaService) {}
    async create(data: ICreateSmtpServer) {
        try {
            const smtpServer = await this.prisma.sMTPServer.create({
                data: {
                    ...isSmtpServerDataValidToCreate(data),
                }
            });

            return smtpServer;
        } catch (err) {
            throw new RepositoryException('Error creating SMTP server', err);
        }
    }

    async selectAll() {
        try {
            const smtpServers = await this.prisma.sMTPServer.findMany({
                select: {
                    id: true,
                    name: true,
                    domain: true,
                    email: true,
                    provider: true,
                    default: true,
                    created_at: true,
                    updated_at: true
                }
            });
            return smtpServers;
        } catch (err) {
            throw new RepositoryException('Error selecting all SMTP servers', err);
        }
    }
    async selectById(id: number) {
        try {
            const smtpServer = await this.prisma.sMTPServer.findUnique({
                where: { id }
            });
            return smtpServer;
        } catch (err) {
            throw new RepositoryException('Error selecting SMTP server by id', err);
        }
    }

    async selectDefault() {
        try {
            const smtpServer = await this.prisma.sMTPServer.findFirst({
                where: { default: true }
            });
            return smtpServer;
        } catch (err) {
            throw new RepositoryException('Error selecting default SMTP server', err);
        }
    }
}
