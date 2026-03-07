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
  metadata?: object;
  tenantSlug: string;
  active: boolean;
}

export async function seedLeadCollections() {
  const collections: LeadCollectionSeed[] = [
    // ── Zarp Studio ──────────────────────────────────────────────────────────
    // Landing page principal: formulário "Vamos conversar?" para captar clientes
    {
      name: 'Landing Page - Contato Comercial',
      slug: 'landing-page-contato-zarp',
      source: 'zarpstudio.com',
      source_type: 'form',
      source_channel: 'organic',
      access_mode: ECollectionAccessMode.public,
      allowed_domains: ['zarpstudio.com', 'www.zarpstudio.com'],
      metadata: {
        description: 'Formulário principal da landing page para captura de potenciais clientes',
        page: 'home',
        form_id: 'hero-cta-form',
        notification_email: 'comercial@zarpstudio.com',
        auto_reply: true,
      },
      tenantSlug: 'zarp-studio',
      active: true,
    },
    // Newsletter do blog: captura emails de leitores interessados em conteúdo de marketing
    {
      name: 'Blog - Newsletter Semanal',
      slug: 'blog-newsletter-zarp',
      source: 'blog.zarpstudio.com',
      source_type: 'newsletter',
      source_channel: 'organic',
      access_mode: ECollectionAccessMode.public,
      allowed_domains: ['blog.zarpstudio.com', 'zarpstudio.com'],
      metadata: {
        description: 'Inscrição na newsletter do blog Zarp Studio',
        page: 'blog',
        frequency: 'weekly',
        topics: ['marketing digital', 'SEO', 'redes sociais', 'branding'],
        notification_email: 'conteudo@zarpstudio.com',
      },
      tenantSlug: 'zarp-studio',
      active: true,
    },
    // Página de Careers: coleta candidaturas com dados de CV (privada, requer chave)
    {
      name: 'Careers - Candidaturas Abertas',
      slug: 'careers-candidaturas-zarp',
      source: 'zarpstudio.com/careers',
      source_type: 'form',
      source_channel: 'organic',
      access_mode: ECollectionAccessMode.private,
      allowed_domains: ['zarpstudio.com', 'www.zarpstudio.com'],
      secret_key: 'zarp-careers-form-secret-2025',
      metadata: {
        description: 'Candidaturas para vagas abertas na Zarp Studio',
        page: 'careers',
        accepts_cv: true,
        cv_storage_collection: 'cv-uploads-zarp-studio',
        notification_email: 'rh@zarpstudio.com',
        auto_reply: true,
        auto_reply_template: 'careers-received',
      },
      tenantSlug: 'zarp-studio',
      active: true,
    },
    // ── Empresa Teste ─────────────────────────────────────────────────────────
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
      name: 'Coleção Privada - Teste',
      slug: 'colecao-privada-teste',
      source: 'api',
      source_type: 'integration',
      source_channel: 'api',
      access_mode: ECollectionAccessMode.private,
      allowed_domains: [],
      secret_key: 'secret-key-123',
      tenantSlug: 'empresa-teste',
      active: true,
    },
    {
      name: 'Coleção Restrita - Domínios',
      slug: 'colecao-restrita-dominios',
      source: 'widget',
      source_type: 'embedded',
      source_channel: 'partner',
      access_mode: ECollectionAccessMode.restricted,
      allowed_domains: ['test-company.com', 'partner.example.com'],
      tenantSlug: 'empresa-teste',
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
    // ── Tech Innovations ──────────────────────────────────────────────────────
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
    // ── All Brick Pavers ──────────────────────────────────────────────────────
    {
      name: 'All Brick Pavers Lead Collection',
      slug: 'frontend_pages_allbrickpavers',
      source: 'allbrickpavers.net',
      source_type: 'form',
      source_channel: 'website',
      access_mode: ECollectionAccessMode.private,
      allowed_domains: ['allbrickpavers.net', 'www.allbrickpavers.net'],
      secret_key: 'abp_secret_2026_fl_pavers_secure',
      metadata: {
        description: 'Lead collection for All Brick Pavers website',
        business_type: 'paver_installation',
        service_area: 'South Florida',
        auto_qualify: true,
        notification_email: 'allbrickpaving@gmail.com',
      },
      tenantSlug: 'allbrickpavers',
      active: true,
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

    const existing = await prisma.leadCollection.findFirst({
      where: { slug: collection.slug, tenant_id: tenant.id },
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
      metadata: collection.metadata ?? null,
      tenant_id: tenant.id,
      active: collection.active,
    };

    if (collection.secret_key) {
      const { hash, salt } = hashSecretKey(collection.secret_key);
      data.secret_key_hash = hash;
      data.secret_key_salt = salt;
    } else {
      data.secret_key_hash = null;
      data.secret_key_salt = null;
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
