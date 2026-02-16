import { PrismaClient } from 'src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const prismaClient = new PrismaClient({
    adapter,
    log: ['query', 'info', 'warn'],
    // log: process.env.AMBIENT == 'DEV' && process.env.ORM_LOGS == 'ON' ? ['error', 'info', 'query', 'warn'] : [],
});

export default prismaClient;