import 'dotenv/config';
import { PrismaClient } from '../../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface AuthorSeed {
  first_name: string;
  last_name: string;
  biography: string;
  tenantSlug: string;
  active: boolean;
}

export async function seedAuthors() {
  const authors: AuthorSeed[] = [
    // -- Gabriel Caliari ----------------------------------------------------------
    {
      first_name: 'Diego',
      last_name: 'Kelme',
      biography:
        'Founder of Gabriel Caliari and a digital marketing strategist with more than 12 years of experience. Specialist in growth hacking, branding, and building strong digital presence for ambitious brands.',
      tenantSlug: 'reserve-studio',
      active: true,
    },
    {
      first_name: 'Emily',
      last_name: 'Clamerick',
      biography:
        'Head of Content Marketing at Gabriel Caliari. Specialist in inbound marketing, copywriting, and social media strategy. She has helped more than 80 brands build engaged audiences from scratch.',
      tenantSlug: 'reserve-studio',
      active: true,
    },
    {
      first_name: 'Gabriel',
      last_name: 'Caliari',
      biography:
        'SEO and digital performance specialist at Gabriel Caliari. Google and HubSpot certified, with a proven track record of increasing organic traffic and conversion for ecommerce and SaaS brands.',
      tenantSlug: 'reserve-studio',
      active: true,
    },
    // -- Florida Exam Prep ----------------------------------------------------
    {
      first_name: 'Cruz',
      last_name: 'Vinci',
      biography:
        'Educational content creator preparing you for Florida State Contractors Exams.',
      tenantSlug: 'florida-exam-prep',
      active: true,
    },
    // -- Gen3 Construction ----------------------------------------------------
    {
      first_name: 'Roberto',
      last_name: 'Santos',
      biography: 'Technology consultant and speaker focused on digital transformation and innovation.',
      tenantSlug: 'gen3-construction',
      active: true,
    },
  ];

  let inserted = 0;
  let updated = 0;

  console.log('\n[AUTHORS SEED]');

  for (const author of authors) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: author.tenantSlug },
    });

    if (!tenant) {
      console.log(`  ⚠ SKIP: Tenant "${author.tenantSlug}" not found for author ${author.first_name} ${author.last_name}`);
      continue;
    }

    const existing = await prisma.author.findFirst({
      where: {
        first_name: author.first_name,
        last_name: author.last_name,
        tenant_id: tenant.id,
      },
    });

    const data = {
      first_name: author.first_name,
      last_name: author.last_name,
      biography: author.biography,
      tenant_id: tenant.id,
      active: author.active,
    };

    if (existing) {
      await prisma.author.update({
        where: { id: existing.id },
        data,
      });
      updated++;
      console.log(`  ↻ Author updated: ${author.first_name} ${author.last_name}`);
    } else {
      await prisma.author.create({ data });
      inserted++;
      console.log(`  ✓ Author created: ${author.first_name} ${author.last_name}`);
    }
  }

  console.log(`\n  Summary: ${inserted} created, ${updated} updated\n`);

  await prisma.$disconnect();
}
