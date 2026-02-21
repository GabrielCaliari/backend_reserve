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
    {
      first_name: 'Diego',
      last_name: 'Kelme',
      biography:
        'Fundador e CTO da Zarp Studio. Especialista em arquitetura de software e desenvolvimento full-stack com mais de 10 anos de experiência.',
      tenantSlug: 'zarp-studio',
      active: true,
    },
    {
      first_name: 'Ana',
      last_name: 'Silva',
      biography:
        'Desenvolvedora sênior especializada em React e Node.js. Apaixonada por criar experiências de usuário excepcionais.',
      tenantSlug: 'zarp-studio',
      active: true,
    },
    {
      first_name: 'Carlos',
      last_name: 'Mendes',
      biography:
        'Engenheiro de software com foco em DevOps e infraestrutura cloud. Entusiasta de automação e CI/CD.',
      tenantSlug: 'empresa-teste',
      active: true,
    },
    {
      first_name: 'Beatriz',
      last_name: 'Costa',
      biography:
        'Product Manager e escritora técnica. Especialista em transformar conceitos complexos em conteúdo acessível.',
      tenantSlug: 'empresa-teste',
      active: true,
    },
    {
      first_name: 'Roberto',
      last_name: 'Santos',
      biography: 'Consultor de tecnologia e palestrante. Foco em transformação digital e inovação.',
      tenantSlug: 'tech-innovations',
      active: true,
    },
  ];

  let inseridos = 0;
  let atualizados = 0;

  console.log('\n[AUTHORS SEED]');

  for (const author of authors) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: author.tenantSlug },
    });

    if (!tenant) {
      console.log(`  ⚠ SKIP: Tenant "${author.tenantSlug}" não encontrado para autor ${author.first_name} ${author.last_name}`);
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
      atualizados++;
      console.log(`  ↻ Autor atualizado: ${author.first_name} ${author.last_name}`);
    } else {
      await prisma.author.create({ data });
      inseridos++;
      console.log(`  ✓ Autor criado: ${author.first_name} ${author.last_name}`);
    }
  }

  console.log(`\n  Resumo: ${inseridos} criados, ${atualizados} atualizados\n`);

  await prisma.$disconnect();
}
