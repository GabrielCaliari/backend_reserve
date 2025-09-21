import RepositoryException from "src/core/exceptions/RepositoryException";
import prismaClient from "../prisma/prismaClient";
import { ICreateSmtpServer } from "src/@types/@smtp-server";
import { isSmtpServerDataValidToCreate } from "../validator/smtp-server.validator";

export default class SMTPServerRepository {
    async create(data: ICreateSmtpServer) {
        try {
            const smtpServer = await prismaClient.sMTPServer.create({
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
            const smtpServers = await prismaClient.sMTPServer.findMany({
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
            const smtpServer = await prismaClient.sMTPServer.findUnique({
                where: { id }
            });
            return smtpServer;
        } catch (err) {
            throw new RepositoryException('Error selecting SMTP server by id', err);
        }
    }

    async selectDefault() {
        try {
            const smtpServer = await prismaClient.sMTPServer.findFirst({
                where: { default: true }
            });
            return smtpServer;
        } catch (err) {
            throw new RepositoryException('Error selecting default SMTP server', err);
        }
    }
}
