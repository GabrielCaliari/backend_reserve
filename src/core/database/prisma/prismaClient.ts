import { PrismaClient } from '@prisma/client'

const prismaClient = new PrismaClient({
    log: ['query', 'info', 'warn'],
    // log: process.env.AMBIENT == 'DEV' && process.env.ORM_LOGS == 'ON' ? ['error', 'info', 'query', 'warn'] : [],
});

export default prismaClient;