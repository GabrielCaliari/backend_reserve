import 'dotenv/config';
import { PrismaClient } from '../../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * CNAE Seed - Sample data only
 * 
 * This seed contains only a small sample of CNAE codes for testing.
 * For production, import the full CNAE table from official sources.
 * 
 * Full CNAE data: https://concla.ibge.gov.br/busca-online-cnae.html
 */
export async function seedCNAEs() {
  const cnaes = [
    { code: '6201500', name: 'Custom software development' },
    { code: '6202300', name: 'Development and licensing of customizable software' },
    { code: '6203100', name: 'Development and licensing of non-customizable software' },
    { code: '6204000', name: 'Information technology consulting' },
    { code: '6209100', name: 'Technical support, maintenance, and other information technology services' },
    { code: '6311900', name: 'Data processing, application service providers, and internet hosting services' },
    { code: '6319400', name: 'Web portals, content providers, and other internet information services' },
    { code: '7020400', name: 'Business management consulting activities' },
    { code: '7311400', name: 'Advertising agencies' },
    { code: '7312200', name: 'Advertising space brokerage, except in communication vehicles' },
    { code: '7319000', name: 'Advertising' },
    { code: '7320300', name: 'Market research and public opinion polling' },
    { code: '7490104', name: 'Intermediation and brokerage of services and business activities in general' },
    { code: '8599699', name: 'Other education activities not specified elsewhere' },
    { code: '9511800', name: 'Repair and maintenance of computers and peripheral equipment' },
  ];

  let inserted = 0;
  let updated = 0;

  console.log('\n[CNAES SEED - SAMPLE DATA]');
  console.log('  ⚠ This seed contains sample data only');
  console.log('  ⚠ For production, import the full CNAE table\n');

  for (const cnae of cnaes) {
    const existing = await prisma.cnae.findFirst({
      where: { code: cnae.code },
    });

    if (existing) {
      await prisma.cnae.update({
        where: { id: existing.id },
        data: { name: cnae.name },
      });
      updated++;
    } else {
      await prisma.cnae.create({
        data: cnae,
      });
      inserted++;
      console.log(`  ✓ CNAE created: ${cnae.code} - ${cnae.name}`);
    }
  }

  console.log(`\n  Summary: ${inserted} created, ${updated} updated\n`);

  await prisma.$disconnect();
}
