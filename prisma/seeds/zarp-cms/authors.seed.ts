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
    // ── Zarp Studio ──────────────────────────────────────────────────────────
    {
      first_name: 'Diego',
      last_name: 'Kelme',
      biography:
        'Fundador da Zarp Studio e estrategista de marketing digital com mais de 12 anos de experiência. Especialista em growth hacking, branding e construção de presença digital para marcas de alto impacto.',
      tenantSlug: 'zarp-studio',
      active: true,
    },
    {
      first_name: 'Mariana',
      last_name: 'Rocha',
      biography:
        'Head de Marketing de Conteúdo da Zarp Studio. Especialista em inbound marketing, copywriting e estratégia de redes sociais. Já ajudou mais de 80 marcas a construírem audiências engajadas do zero.',
      tenantSlug: 'zarp-studio',
      active: true,
    },
    {
      first_name: 'Felipe',
      last_name: 'Duarte',
      biography:
        'Especialista em SEO e performance digital na Zarp Studio. Certificado pelo Google e HubSpot, com histórico comprovado de aumento de tráfego orgânico e conversão para e-commerces e SaaS.',
      tenantSlug: 'zarp-studio',
      active: true,
    },
    // ── Empresa Teste ─────────────────────────────────────────────────────────
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
    // ── Tech Innovations ──────────────────────────────────────────────────────
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
