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
    // -- Gabriel Caliari ----------------------------------------------------------
    // Main landing page: "Let's talk" form used to capture commercial leads
    {
      name: 'Landing Page - Commercial Contact',
      slug: 'landing-page-commercial-contact-Reserve',
      source: 'GabrielCaliari.com',
      source_type: 'form',
      source_channel: 'organic',
      access_mode: ECollectionAccessMode.public,
      allowed_domains: ['GabrielCaliari.com', 'www.GabrielCaliari.com'],
      metadata: {
        description: 'Main landing page form used to capture potential customers',
        page: 'home',
        form_id: 'hero-cta-form',
        notification_email: 'comercial@GabrielCaliari.com',
        auto_reply: true,
      },
      tenantSlug: 'reserve-studio',
      active: true,
    },
    // Blog newsletter: captures emails from readers interested in marketing content
    {
      name: 'Blog - Weekly Newsletter',
      slug: 'blog-weekly-newsletter-Reserve',
      source: 'blog.GabrielCaliari.com',
      source_type: 'newsletter',
      source_channel: 'organic',
      access_mode: ECollectionAccessMode.public,
      allowed_domains: ['blog.GabrielCaliari.com', 'GabrielCaliari.com'],
      metadata: {
        description: 'Subscription form for the Gabriel Caliari blog newsletter',
        page: 'blog',
        frequency: 'weekly',
        topics: ['digital marketing', 'SEO', 'social media', 'branding'],
        notification_email: 'conteudo@GabrielCaliari.com',
      },
      tenantSlug: 'reserve-studio',
      active: true,
    },
    // Careers page: captures job applications with CV data (private, requires a key)
    {
      name: 'Careers - Open Applications',
      slug: 'careers-open-applications-Reserve',
      source: 'GabrielCaliari.com/careers',
      source_type: 'form',
      source_channel: 'organic',
      access_mode: ECollectionAccessMode.private,
      allowed_domains: ['GabrielCaliari.com', 'www.GabrielCaliari.com'],
      secret_key: 'reserve-careers-form-secret-2025',
      metadata: {
        description: 'Applications for open positions at Gabriel Caliari',
        page: 'careers',
        accepts_cv: true,
        cv_storage_collection: 'cv-uploads-reserve-studio',
        notification_email: 'rh@GabrielCaliari.com',
        auto_reply: true,
        auto_reply_template: 'careers-received',
      },
      tenantSlug: 'reserve-studio',
      active: true,
    },
    // -- Level One Grading ----------------------------------------------------
    {
      name: 'Contact Form - Level One Grading',
      slug: 'contact-level-one-grading',
      source: 'levelonegrading.com',
      source_type: 'organic',
      source_channel: 'direct',
      access_mode: ECollectionAccessMode.public,
      allowed_domains: ['levelonegrading.com', 'www.levelonegrading.com'],
      tenantSlug: 'level-one-grading',
      active: true,
    },
    {
      name: 'Private Collection - Level One Grading',
      slug: 'private-collection-level-one-grading',
      source: 'api',
      source_type: 'integration',
      source_channel: 'api',
      access_mode: ECollectionAccessMode.private,
      allowed_domains: [],
      secret_key: 'secret-key-123',
      tenantSlug: 'level-one-grading',
      active: true,
    },
    {
      name: 'Restricted Collection - Level One Grading Partners',
      slug: 'restricted-collection-level-one-grading',
      source: 'widget',
      source_type: 'embedded',
      source_channel: 'partner',
      access_mode: ECollectionAccessMode.restricted,
      allowed_domains: ['levelonegrading.com', 'partners.levelonegrading.com'],
      tenantSlug: 'level-one-grading',
      active: true,
    },
    {
      name: 'Inactive Collection - Level One Grading',
      slug: 'inactive-collection-level-one-grading',
      source: 'test',
      access_mode: ECollectionAccessMode.public,
      allowed_domains: [],
      tenantSlug: 'level-one-grading',
      active: false,
    },
    // -- Gen3 Construction ----------------------------------------------------
    {
      name: 'Webinar - Gen3 Construction',
      slug: 'webinar-gen3-construction',
      source: 'event',
      source_type: 'organic',
      source_channel: 'webinar',
      source_campaign: 'webinar-q1-2024',
      access_mode: ECollectionAccessMode.restricted,
      allowed_domains: ['gen3construction.vercel.app'],
      tenantSlug: 'gen3-construction',
      active: true,
    },
    // -- All Brick Pavers -----------------------------------------------------
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

  let inserted = 0;
  let updated = 0;

  console.log('\n[LEAD COLLECTIONS SEED]');

  for (const collection of collections) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: collection.tenantSlug },
    });

    if (!tenant) {
      console.log(`  WARNING SKIP: Tenant "${collection.tenantSlug}" not found for collection "${collection.name}"`);
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
      updated++;
      console.log(`  UPDATED collection: ${collection.name}`);
    } else {
      await prisma.leadCollection.create({ data });
      inserted++;
      console.log(`  CREATED collection: ${collection.name}`);
    }
  }

  console.log(`\n  Summary: ${inserted} created, ${updated} updated\n`);

  await prisma.$disconnect();
}
