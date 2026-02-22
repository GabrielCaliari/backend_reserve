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
      name: 'Empresa Teste',
      slug: 'empresa-teste',
      domain: 'empresateste.com.br',
      active: true,
    },
    {
      name: 'Tech Innovations',
      slug: 'tech-innovations',
      domain: 'techinnovations.io',
      active: true,
    },
    {
      name: 'All Brick Pavers',
      slug: 'allbrickpavers',
      domain: 'allbrickpavers.net',
      active: true,
    },
    {
      name: 'Tenant Inativo',
      slug: 'tenant-inativo',
      domain: null,
      active: false,
    },
  ];

  let inseridos = 0;
  let atualizados = 0;

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
      atualizados++;
      console.log(`  ↻ Tenant atualizado: ${tenant.slug}`);
    } else {
      await prisma.tenant.create({
        data: {
          name: tenant.name,
          slug: tenant.slug,
          domain: tenant.domain,
          active: tenant.active,
        },
      });
      inseridos++;
      console.log(`  ✓ Tenant criado: ${tenant.slug}`);
    }
  }

  console.log(`\n  Resumo: ${inseridos} criados, ${atualizados} atualizados\n`);

  await prisma.$disconnect();
}
