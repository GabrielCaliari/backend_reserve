import 'dotenv/config';
import { PrismaClient } from '../../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface PlanSeed {
  name: string;
  slug: string;
  maximum_queries: number;
  maximum_queries_to_export: number;
  maximum_brand_analysis: number;
  month_price_id?: string;
  annual_price_id?: string;
}

export async function seedPlans() {
  const plans: PlanSeed[] = [
    {
      name: 'Free',
      slug: 'free',
      maximum_queries: 100,
      maximum_queries_to_export: 10,
      maximum_brand_analysis: 5,
    },
    {
      name: 'Starter',
      slug: 'starter',
      maximum_queries: 1000,
      maximum_queries_to_export: 100,
      maximum_brand_analysis: 20,
      month_price_id: 'price_starter_month',
      annual_price_id: 'price_starter_annual',
    },
    {
      name: 'Professional',
      slug: 'professional',
      maximum_queries: 10000,
      maximum_queries_to_export: 1000,
      maximum_brand_analysis: 100,
      month_price_id: 'price_professional_month',
      annual_price_id: 'price_professional_annual',
    },
    {
      name: 'Enterprise',
      slug: 'enterprise',
      maximum_queries: 999999,
      maximum_queries_to_export: 999999,
      maximum_brand_analysis: 999999,
      month_price_id: 'price_enterprise_month',
      annual_price_id: 'price_enterprise_annual',
    },
    {
      name: 'Legacy Plan',
      slug: 'legacy',
      maximum_queries: 500,
      maximum_queries_to_export: 50,
      maximum_brand_analysis: 10,
    },
  ];

  let inserted = 0;
  let updated = 0;

  console.log('\n[PLANS SEED]');

  for (const plan of plans) {
    const existing = await prisma.plan.findFirst({
      where: { slug: plan.slug },
    });

    const data = {
      name: plan.name,
      slug: plan.slug,
      maximum_queries: plan.maximum_queries,
      maximum_queries_to_export: plan.maximum_queries_to_export,
      maximum_brand_analysis: plan.maximum_brand_analysis,
      month_price_id: plan.month_price_id,
      annual_price_id: plan.annual_price_id,
    };

    if (existing) {
      await prisma.plan.update({
        where: { id: existing.id },
        data,
      });
      updated++;
      console.log(`  ↻ Plan updated: ${plan.name}`);
    } else {
      await prisma.plan.create({ data });
      inserted++;
      console.log(`  ✓ Plan created: ${plan.name}`);
    }
  }

  console.log(`\n  Summary: ${inserted} created, ${updated} updated\n`);

  await prisma.$disconnect();
}
