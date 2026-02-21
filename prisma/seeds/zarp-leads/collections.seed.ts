import 'dotenv/config';
import { PrismaClient, ECollectionAccessMode } from '../../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as crypto from 'crypto';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/** Hash a secret key for collection authentication */
function hashSecretKey(value: string): { salt: string; hash: string } {
  const pk = process.env.ENCRYPT_PRIVATE_KEY;
  if (!pk) throw new Error('ENCRYPT_PRIVATE_KEY env var not set');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(value, salt + pk, 856, 64, 'sha512').toString('hex');
  return { salt, hash };
}

interface LeadCollectionSeed {
  name: string;
  slug: string;
  source: string;
  source_type?: string;
  source_channel?: string;
  source_campaign?: string;
  access_mode: ECollectionAccessMode;
  allowed_domains: string[];
  secret_key?: string;
  tenantSlug: string;
  active: boolean;
}

export async function seedLeadCollections() {
  const collections: LeadCollectionSeed[] = [
    {
      name: 'Website Principal - Zarp Studio',
      slug: 'website-zarp-studio',
      source: 'website',
      source_type: 'organic',
      source_channel: 'direct',
      access_mode: ECollectionAccessMode.public,
      allowed_domains: [],
      tenantSlug: 'zarp-studio',
      active: true,
    },
    {
      name: 'Landing Page - Campanha Black Friday',
      slug: 'lp-black-friday-2024',
      source: 'landing-page',
      source_type: 'paid',
      source_channel: 'google-ads',
      source_campaign: 'black-friday-2024',
      access_mode: ECollectionAccessMode.restricted,
      allowed_domains: ['zarpstudio.com', 'lp.zarpstudio.com'],
      tenantSlug: 'zarp-studio',
      active: true,
    },
    {
      name: 'API Integração - Parceiros',
      slug: 'api-parceiros-zarp',
      source: 'api',
      source_type: 'integration',
      source_channel: 'api',
      access_mode: ECollectionAccessMode.private,
      allowed_domains: [],
      secret_key: 'zarp-api-partners-secret-2024',
      tenantSlug: 'zarp-studio',
      active: true,
    },
    {
      name: 'Formulário de Contato - Empresa Teste',
      slug: 'contato-empresa-teste',
      source: 'website',
      source_type: 'organic',
      source_channel: 'direct',
      access_mode: ECollectionAccessMode.public,
      allowed_domains: [],
      tenantSlug: 'empresa-teste',
      active: true,
    },
    {
      name: 'Webinar - Tech Innovations',
      slug: 'webinar-tech-innovations',
      source: 'event',
      source_type: 'organic',
      source_channel: 'webinar',
      source_campaign: 'webinar-q1-2024',
      access_mode: ECollectionAccessMode.restricted,
      allowed_domains: ['techinnovations.io'],
      tenantSlug: 'tech-innovations',
      active: true,
    },
    {
      name: 'Coleção Inativa - Teste',
      slug: 'colecao-inativa-teste',
      source: 'test',
      access_mode: ECollectionAccessMode.public,
      allowed_domains: [],
      tenantSlug: 'empresa-teste',
      active: false,
    },
  ];

  let inseridos = 0;
  let atualizados = 0;

  console.log('\n[LEAD COLLECTIONS SEED]');

  for (const collection of collections) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: collection.tenantSlug },
    });

    if (!tenant) {
      console.log(`  ⚠ SKIP: Tenant "${collection.tenantSlug}" não encontrado para coleção "${collection.name}"`);
      continue;
    }

    const existing = await prisma.leadCollection.findUnique({
      where: { slug: collection.slug },
    });

    const data: any = {
      name: collection.name,
      slug: collection.slug,
      source: collection.source,
      source_type: collection.source_type,
      source_channel: collection.source_channel,
      source_campaign: collection.source_campaign,
      access_mode: collection.access_mode,
      allowed_domains: collection.allowed_domains,
      tenant_id: tenant.id,
      active: collection.active,
    };

    // Add secret key hash if provided
    if (collection.secret_key) {
      const { hash, salt } = hashSecretKey(collection.secret_key);
      data.secret_key_hash = hash;
      data.secret_key_salt = salt;
    }

    if (existing) {
      await prisma.leadCollection.update({
        where: { id: existing.id },
        data,
      });
      atualizados++;
      console.log(`  ↻ Collection atualizada: ${collection.name}`);
    } else {
      await prisma.leadCollection.create({ data });
      inseridos++;
      console.log(`  ✓ Collection criada: ${collection.name}`);
    }
  }

  console.log(`\n  Resumo: ${inseridos} criados, ${atualizados} atualizados\n`);

  await prisma.$disconnect();
}
