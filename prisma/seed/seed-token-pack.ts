import 'dotenv/config';
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function seedTokenPack() {
    const tokenPacks = [
        {
            slug: 'pack-50-tokens',
            external_id: 'price_stripe_50_tokens',
        },
        {
            slug: 'pack-100-tokens',
            external_id: 'price_stripe_100_tokens',
        },
        {
            slug: 'pack-250-tokens',
            external_id: 'price_stripe_250_tokens',
        },
        {
            slug: 'pack-500-tokens',
            external_id: 'price_stripe_500_tokens',
        },
    ];

    let inseridos = 0;
    let atualizados = 0;

    for (const pack of tokenPacks) {
        const existing = await prisma.additionalTokenPack.findFirst({
            where: { slug: pack.slug },
        });

        if (existing) {
            await prisma.additionalTokenPack.update({
                where: { id: existing.id },
                data: {
                    external_id: pack.external_id,
                },
            });
            atualizados++;
        } else {
            await prisma.additionalTokenPack.create({
                data: pack,
            });
            inseridos++;
        }
    }

    console.log(`\n----------------------------------------------------------------------------------\n`);
    console.log(`Token Packs inseridos: ${inseridos}, atualizados: ${atualizados}`);
    console.log(`\n----------------------------------------------------------------------------------\n`);
}
