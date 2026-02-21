import 'dotenv/config';
import { PrismaClient } from '../../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface TokenPackSeed {
  slug: string;
  external_id: string;
}

export async function seedTokenPacks() {
  const tokenPacks: TokenPackSeed[] = [
    {
      slug: 'pack-100-tokens',
      external_id: 'price_pack_100_tokens',
    },
    {
      slug: 'pack-500-tokens',
      external_id: 'price_pack_500_tokens',
    },
    {
      slug: 'pack-1000-tokens',
      external_id: 'price_pack_1000_tokens',
    },
    {
      slug: 'pack-5000-tokens',
      external_id: 'price_pack_5000_tokens',
    },
    {
      slug: 'pack-10000-tokens',
      external_id: 'price_pack_10000_tokens',
    },
  ];

  let inseridos = 0;
  let atualizados = 0;

  console.log('\n[TOKEN PACKS SEED]');

  for (const pack of tokenPacks) {
    const existing = await prisma.additionalTokenPack.findFirst({
      where: { slug: pack.slug },
    });

    const data = {
      slug: pack.slug,
      external_id: pack.external_id,
    };

    if (existing) {
      await prisma.additionalTokenPack.update({
        where: { id: existing.id },
        data,
      });
      atualizados++;
      console.log(`  ↻ Token pack updated: ${pack.slug}`);
    } else {
      await prisma.additionalTokenPack.create({ data });
      inseridos++;
      console.log(`  ✓ Token pack created: ${pack.slug}`);
    }
  }

  console.log(`\n  Summary: ${inseridos} created, ${atualizados} updated\n`);

  await prisma.$disconnect();
}
