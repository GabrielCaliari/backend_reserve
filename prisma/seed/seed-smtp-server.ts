import 'dotenv/config';
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';
import * as crypto from 'crypto';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/** Hash password/token for SMTP server */
function hashValue(value: string): string {
    const pk = process.env.ENCRYPT_PRIVATE_KEY;
    if (!pk) throw new Error('ENCRYPT_PRIVATE_KEY env var not set');
    const salt = crypto.randomBytes(16).toString('hex');
    return crypto.pbkdf2Sync(value, salt + pk, 856, 64, 'sha512').toString('hex');
}

export async function seedSMTPServer() {
    const smtpServers = [
        {
            name: 'AWS SES - Produção',
            email: 'noreply@zarpstudio.com',
            domain: 'zarpstudio.com',
            host: null,
            port: null,
            username: null,
            password: null,
            access_token: process.env.AWS_SES_ACCESS_TOKEN || 'aws-access-token-example',
            private_token: null,
            region: 'us-east-1',
            provider: 1, // AWS SES
            default: true,
        },
        {
            name: 'SMTP Teste - Gmail',
            email: 'teste@gmail.com',
            domain: 'gmail.com',
            host: 'smtp.gmail.com',
            port: '587',
            username: 'teste@gmail.com',
            password: 'senha-app-gmail',
            access_token: null,
            private_token: null,
            region: null,
            provider: 0, // SMTP genérico
            default: false,
        },
    ];

    let inseridos = 0;
    let atualizados = 0;

    for (const server of smtpServers) {
        const existing = await prisma.sMTPServer.findFirst({
            where: {
                email: server.email,
            },
        });

        const data: any = {
            name: server.name,
            email: server.email,
            domain: server.domain,
            host: server.host,
            port: server.port,
            username: server.username,
            region: server.region,
            provider: server.provider,
            default: server.default,
        };

        // Hash sensitive data
        if (server.password) {
            data.hash_password = hashValue(server.password);
        }
        if (server.access_token) {
            data.hash_access_token = hashValue(server.access_token);
        }
        if (server.private_token) {
            data.hash_private_token = hashValue(server.private_token);
        }

        if (existing) {
            await prisma.sMTPServer.update({
                where: { id: existing.id },
                data,
            });
            atualizados++;
        } else {
            await prisma.sMTPServer.create({ data });
            inseridos++;
        }
    }

    console.log(`\n----------------------------------------------------------------------------------\n`);
    console.log(`SMTP Servers inseridos: ${inseridos}, atualizados: ${atualizados}`);
    console.log(`\n----------------------------------------------------------------------------------\n`);
}
