import 'dotenv/config';
import { PrismaClient } from '../../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as crypto from 'crypto';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/** Hash a secret key for blog authentication */
function hashSecretKey(value: string): { salt: string; hash: string } {
  const pk = process.env.ENCRYPT_PRIVATE_KEY;
  if (!pk) throw new Error('ENCRYPT_PRIVATE_KEY env var not set');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(value, salt + pk, 856, 64, 'sha512').toString('hex');
  return { salt, hash };
}

interface BlogSeed {
  name: string;
  description: string;
  secret_key: string;
  tenantSlug: string;
  active: boolean;
}

export async function seedBlogs() {
  const blogs: BlogSeed[] = [
    {
      name: 'Blog Zarp Studio',
      description:
        'Insights sobre desenvolvimento de software, arquitetura de sistemas e as últimas tendências em tecnologia.',
      secret_key: 'zarp-blog-secret-2024',
      tenantSlug: 'zarp-studio',
      active: true,
    },
    {
      name: 'Tech Insights',
      description: 'Artigos técnicos e tutoriais para desenvolvedores de todos os níveis.',
      secret_key: 'tech-insights-secret-2024',
      tenantSlug: 'empresa-teste',
      active: true,
    },
    {
      name: 'Innovation Hub',
      description: 'Explorando o futuro da tecnologia e inovação digital.',
      secret_key: 'innovation-hub-secret-2024',
      tenantSlug: 'tech-innovations',
      active: true,
    },
  ];

  let inseridos = 0;
  let atualizados = 0;

  console.log('\n[BLOGS SEED]');

  for (const blog of blogs) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: blog.tenantSlug },
    });

    if (!tenant) {
      console.log(`  ⚠ SKIP: Tenant "${blog.tenantSlug}" não encontrado para blog "${blog.name}"`);
      continue;
    }

    const { hash, salt } = hashSecretKey(blog.secret_key);

    const existing = await prisma.blog.findFirst({
      where: {
        name: blog.name,
        tenant_id: tenant.id,
      },
    });

    const data = {
      name: blog.name,
      description: blog.description,
      secret_key_hash: hash,
      secret_key_salt: salt,
      tenant_id: tenant.id,
      active: blog.active,
    };

    if (existing) {
      await prisma.blog.update({
        where: { id: existing.id },
        data,
      });
      atualizados++;
      console.log(`  ↻ Blog atualizado: ${blog.name}`);
    } else {
      await prisma.blog.create({ data });
      inseridos++;
      console.log(`  ✓ Blog criado: ${blog.name}`);
    }
  }

  console.log(`\n  Resumo: ${inseridos} criados, ${atualizados} atualizados\n`);

  await prisma.$disconnect();
}
