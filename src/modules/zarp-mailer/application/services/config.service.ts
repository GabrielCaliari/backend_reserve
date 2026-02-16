import { Injectable } from '@nestjs/common';
import { ESMTPProvider, ICreateSmtpServer } from '@/@types/@smtp-server';
import { ERROR_CREATE_SMTP_SERVER, ERROR_FIND_SMTP_SERVER } from '@/modules/zarp-mailer/domain/constants';
import SMTPServerRepository from '@/modules/zarp-mailer/infrastructure/repositories/smtp-server-legacy.repository';
import { env, errorResponse, successResponse } from '@/shared/helpers';
import { EncryptProvider } from '@/shared/providers/encrypt.provider';

@Injectable()
export class ConfigService {
    public constructor(
        private readonly smtpServerRepository: SMTPServerRepository,
        private readonly encryptProvider: EncryptProvider,
    ) { } 

    public async createSmtpServer(data: { name: string, email: string, provider: number, default?: boolean, smtp?: { host: string, port: string, username: string, password: string }, api?: { access_token: string, private_token: string, region?: string } }) {
        try {
            let values: ICreateSmtpServer;
            let pk = env('SMTP_PRIVATE_KEY');

            switch (data.provider) {
                case ESMTPProvider.smtp:
                    const hashPassword = await this.encryptProvider.encrypt(data.smtp.password, `${data.email}-${pk}`);
                    values = {
                        name: data.name,
                        email: data.email,
                        host: data.smtp.host,
                        domain: data.email.split('@')[1],
                        port: data.smtp.port,
                        username: data.smtp.username,
                        hash_password: hashPassword.hash,
                        provider: ESMTPProvider.smtp,
                        ...(data.default && { default: true })
                    }
                    break;
                case ESMTPProvider.amazon:
                    const hashAcessToken = await this.encryptProvider.encrypt(data.api.access_token, `${data.email}-${pk}`);
                    const hashPrivateToken = await this.encryptProvider.encrypt(data.api.private_token, `${data.email}-${pk}`);

                    values = {
                        name: data.name,
                        email: data.email,
                        domain: data.email.split('@')[1],
                        provider: ESMTPProvider.amazon,
                        region: data.api.region,
                        hash_access_token: hashAcessToken.hash,
                        hash_private_token: hashPrivateToken.hash,
                        ...(data.default && { default: true })
                    }
                    break;
                default:
                    throw new Error(`Provider not found. ${data.provider}`);
            }

            const smtpServer = await this.smtpServerRepository.create(values);

            return successResponse({
                id: smtpServer.id,
            })
        } catch (err) {
            return errorResponse(ERROR_CREATE_SMTP_SERVER, 500, err);
        }
    }

    public async findSmtpServers() {
        try {
            const smtpServers = await this.smtpServerRepository.selectAll();

            return successResponse({
                smtp_servers: smtpServers
            })
        } catch (err) {
            return errorResponse(ERROR_FIND_SMTP_SERVER, 500, err);
        }
    }
}
