import 'dotenv/config';
import { PrismaClient } from '../../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface TenantSeed {
  name: string;
  slug: string;
  domain: string | null;
  active: boolean;
}

export async function seedTenants() {
  const tenants: TenantSeed[] = [
    {
      name: 'Zarp Studio',
      slug: 'zarp-studio',
      domain: 'zarpstudio.com',
      active: true,
    },
    {
      name: 'Florida Exam Prep',
      slug: 'florida-exam-prep',
      domain: 'floridaexamprep.com',
      active: true,
    },
    {
      name: 'Level One Grading',
      slug: 'level-one-grading',
      domain: 'levelonegrading.com',
      active: true,
    },
    {
      name: 'All Brick Pavers',
      slug: 'allbrickpavers',
      domain: 'allbrickpavers.net',
      active: true,
    },
    {
      name: 'Gen3 Construction',
      slug: 'gen3-construction',
      domain: 'gen3construction.vercel.app',
      active: true,
    },
  ];

  let inserted = 0;
  let updated = 0;

  console.log('\n[TENANTS SEED]');

  for (const tenant of tenants) {
    const existing = await prisma.tenant.findUnique({
      where: { slug: tenant.slug },
    });

    if (existing) {
      await prisma.tenant.update({
        where: { id: existing.id },
        data: {
          name: tenant.name,
          domain: tenant.domain,
          active: tenant.active,
        },
      });
      updated++;
      console.log(`  ↻ Tenant updated: ${tenant.slug}`);
    } else {
      await prisma.tenant.create({
        data: {
          name: tenant.name,
          slug: tenant.slug,
          domain: tenant.domain,
          active: tenant.active,
        },
      });
      inserted++;
      console.log(`  ✓ Tenant created: ${tenant.slug}`);
    }
  }

  console.log(`\n  Summary: ${inserted} created, ${updated} updated\n`);

  await prisma.$disconnect();
}
