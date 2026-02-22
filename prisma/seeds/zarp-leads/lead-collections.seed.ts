import 'dotenv/config';
import {
  PrismaClient,
  ECollectionAccessMode,
} from '../../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as crypto from 'crypto';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/** Hash a secret key for collection authentication */
function hashSecretKey(value: string): { salt: string; hash: string } {
  const pk = process.env.ENCRYPT_PRIVATE_KEY;
  if (!pk) throw new Error('ENCRYPT_PRIVATE_KEY env var not set');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(value, salt + pk, 856, 64, 'sha512')
    .toString('hex');
  return { salt, hash };
}

export async function seedLeadCollections() {
  const collections = [
    {
      name: 'General Public Collection',
      slug: 'colecao-publica-geral',
      source: 'website',
      source_type: 'form',
      source_channel: 'organic',
      access_mode: ECollectionAccessMode.public,
      allowed_domains: [],
      secret_key: null,
      metadata: {
        description: 'Main public lead collection for website forms',
        auto_qualify: true,
      },
      tenantSlug: 'zarp-studio',
    },
    {
      name: 'Landing Page Leads',
      slug: 'landing-page-leads',
      source: 'landing-page',
      source_type: 'form',
      source_channel: 'paid',
      source_campaign: 'product-launch-2024',
      access_mode: ECollectionAccessMode.public,
      allowed_domains: [],
      secret_key: null,
      metadata: {
        description: 'Leads from product launch landing pages',
        priority: 'high',
      },
      tenantSlug: 'zarp-studio',
    },
    {
      name: 'Private Test Collection',
      slug: 'colecao-privada-teste',
      source: 'api',
      source_type: 'integration',
      source_channel: 'api',
      access_mode: ECollectionAccessMode.private,
      allowed_domains: [],
      secret_key: 'secret-key-123',
      metadata: {
        description: 'Private collection for API integrations',
      },
      tenantSlug: 'empresa-teste',
    },
    {
      name: 'Domain Restricted Collection',
      slug: 'colecao-restrita-dominios',
      source: 'widget',
      source_type: 'embedded',
      source_channel: 'partner',
      access_mode: ECollectionAccessMode.restricted,
      allowed_domains: ['test-company.com', 'partner.example.com'],
      secret_key: null,
      metadata: {
        description: 'Restricted to specific partner domains',
      },
      tenantSlug: 'empresa-teste',
    },
    {
      name: 'All Brick Pavers Lead Collection',
      slug: 'allbrickpavers-leads',
      source: 'allbrickpavers.net',
      source_type: 'form',
      source_channel: 'website',
      source_campaign: null,
      access_mode: ECollectionAccessMode.private,
      allowed_domains: ['allbrickpavers.net', 'www.allbrickpavers.net'],
      secret_key: 'abp_secret_2026_fl_pavers_secure',
      metadata: {
        description: 'Lead collection for All Brick Pavers website',
        business_type: 'paver_installation',
        service_area: 'South Florida',
        auto_qualify: true,
        notification_email: 'leads@allbrickpavers.net',
      },
      tenantSlug: 'allbrickpavers',
    },
  ];

  let inserted = 0;
  let updated = 0;

  for (const collection of collections) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: collection.tenantSlug },
    });

    if (!tenant) {
      console.log(
        `[SKIP] Tenant "${collection.tenantSlug}" not found for collection "${collection.name}"`,
      );
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
      metadata: collection.metadata,
      tenant_id: tenant.id,
      active: true,
    };

    // Add secret key hash if provided
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
    } else {
      await prisma.leadCollection.create({ data });
      inserted++;
    }
  }

  console.log(
    `\n----------------------------------------------------------------------------------\n`,
  );
  console.log(`Lead collections inserted: ${inserted}, updated: ${updated}`);
  console.log(
    `\n----------------------------------------------------------------------------------\n`,
  );
}
