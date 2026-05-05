/**
 * Script: seed-b2c-courses.ts
 *
 * Creates B2C course and bundle products (one_time_exp, 12-month access) in Stripe
 * and persists them in the b2c_products + b2c_product_prices tables.
 *
 * Products with type 'book' or 'tabs' are NOT included here — see seed-b2c-books-tabs.ts.
 *
 * Run: pnpm exec ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed-b2c-courses.ts
 */

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import Stripe from 'stripe';
import * as crypto from 'crypto';

// ─── Config ───────────────────────────────────────────────────────────────────

const TENANT_ID = 'cmon7u18s0002fckgp42w2t0m';
const CURRENCY = 'usd';

/** Access duration for one_time_exp products: 12 months */
const ACCESS_DURATION_DAYS = 365;

// ─── Stripe key decryption ────────────────────────────────────────────────────

function deriveEncryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET ?? 'fallback-dev-secret-change-in-prod';
  return crypto.createHash('sha256').update(secret).digest();
}

function decrypt(ciphertext: string): string {
  const key = deriveEncryptionKey();
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

// ─── Product list ─────────────────────────────────────────────────────────────
// priceInCents = final sale price in USD × 100
// billing_mode = 'one_time_exp' for all entries (access expires after 12 months)

type ProductType = 'course' | 'bundle';

interface B2CProduct {
  category: string;
  name: string;
  slug: string;
  priceInCents: number;
  type: ProductType;
}

const PRODUCTS: B2CProduct[] = [
  // ── Business and Finance ──────────────────────────────────────────────────
  {
    category: 'Business and Finance',
    name: 'Business and Finance Basic Course',
    slug: 'business-and-finance-basic-course',
    priceInCents: 30000,   // $300
    type: 'course',
  },
  {
    category: 'Business and Finance',
    name: 'Business and Finance Complete Course',
    slug: 'business-and-finance-complete-course',
    priceInCents: 45000,   // $450
    type: 'course',
  },
  {
    category: 'Business and Finance',
    name: 'Business and Finance Complete Course + Books + Tabs',
    slug: 'business-and-finance-complete-course-books-tabs',
    priceInCents: 82100,   // $821
    type: 'bundle',
  },

  // ── General Contractor ────────────────────────────────────────────────────
  {
    category: 'General Contractor',
    name: 'General Contractor Basic Course',
    slug: 'general-contractor-basic-course',
    priceInCents: 80000,   // $800
    type: 'course',
  },
  {
    category: 'General Contractor',
    name: 'General Contractor Complete Course',
    slug: 'general-contractor-complete-course',
    priceInCents: 120000,  // $1,200
    type: 'course',
  },
  {
    category: 'General Contractor',
    name: 'General Contractor Complete Course + Books + Tabs',
    slug: 'general-contractor-complete-course-books-tabs',
    priceInCents: 294500,  // $2,945
    type: 'bundle',
  },

  // ── Building Contractor ───────────────────────────────────────────────────
  {
    category: 'Building Contractor',
    name: 'Building Contractor Basic Course',
    slug: 'building-contractor-basic-course',
    priceInCents: 80000,   // $800
    type: 'course',
  },
  {
    category: 'Building Contractor',
    name: 'Building Contractor Complete Course',
    slug: 'building-contractor-complete-course',
    priceInCents: 120000,  // $1,200
    type: 'course',
  },
  {
    category: 'Building Contractor',
    name: 'Building Contractor Complete Course + Books + Tabs',
    slug: 'building-contractor-complete-course-books-tabs',
    priceInCents: 294500,  // $2,945
    type: 'bundle',
  },

  // ── Residential Contractor ────────────────────────────────────────────────
  {
    category: 'Residential Contractor',
    name: 'Residential Contractor Basic Course',
    slug: 'residential-contractor-basic-course',
    priceInCents: 80000,   // $800
    type: 'course',
  },
  {
    category: 'Residential Contractor',
    name: 'Residential Contractor Complete Course',
    slug: 'residential-contractor-complete-course',
    priceInCents: 120000,  // $1,200
    type: 'course',
  },
  {
    category: 'Residential Contractor',
    name: 'Residential Contractor Complete Course + Books + Tabs',
    slug: 'residential-contractor-complete-course-books-tabs',
    priceInCents: 294500,  // $2,945
    type: 'bundle',
  },

  // ── Roofing ───────────────────────────────────────────────────────────────
  {
    category: 'Roofing',
    name: 'Roofing Basic Course',
    slug: 'roofing-basic-course',
    priceInCents: 50000,   // $500
    type: 'course',
  },
  {
    category: 'Roofing',
    name: 'Roofing Complete Course',
    slug: 'roofing-complete-course',
    priceInCents: 75000,   // $750
    type: 'course',
  },
  {
    category: 'Roofing',
    name: 'Roofing Complete Course + Books + Tabs',
    slug: 'roofing-complete-course-books-tabs',
    priceInCents: 249500,  // $2,495
    type: 'bundle',
  },

  // ── Plumbing ──────────────────────────────────────────────────────────────
  {
    category: 'Plumbing',
    name: 'Plumbing Complete Course + Books + Tabs',
    slug: 'plumbing-complete-course-books-tabs',
    priceInCents: 520000,  // $5,200
    type: 'bundle',
  },

  // ── Air A ─────────────────────────────────────────────────────────────────
  {
    category: 'Air A',
    name: 'Air A Basic Course',
    slug: 'air-a-basic-course',
    priceInCents: 80000,   // $800
    type: 'course',
  },
  {
    category: 'Air A',
    name: 'Air A Complete Course',
    slug: 'air-a-complete-course',
    priceInCents: 120000,  // $1,200
    type: 'course',
  },
  {
    category: 'Air A',
    name: 'Air A Complete Course + Books + Tabs',
    slug: 'air-a-complete-course-books-tabs',
    priceInCents: 322000,  // $3,220
    type: 'bundle',
  },

  // ── Air B ─────────────────────────────────────────────────────────────────
  {
    category: 'Air B',
    name: 'Air B Basic Course',
    slug: 'air-b-basic-course',
    priceInCents: 80000,   // $800
    type: 'course',
  },
  {
    category: 'Air B',
    name: 'Air B Complete Course',
    slug: 'air-b-complete-course',
    priceInCents: 120000,  // $1,200
    type: 'course',
  },
  {
    category: 'Air B',
    name: 'Air B Complete Course + Books + Tabs',
    slug: 'air-b-complete-course-books-tabs',
    priceInCents: 322000,  // $3,220
    type: 'bundle',
  },

  // ── Mechanical ────────────────────────────────────────────────────────────
  {
    category: 'Mechanical',
    name: 'Mechanical Basic Course',
    slug: 'mechanical-basic-course',
    priceInCents: 80000,   // $800
    type: 'course',
  },
  {
    category: 'Mechanical',
    name: 'Mechanical Complete Course',
    slug: 'mechanical-complete-course',
    priceInCents: 120000,  // $1,200
    type: 'course',
  },
  {
    category: 'Mechanical',
    name: 'Mechanical Complete Course + Books + Tabs',
    slug: 'mechanical-complete-course-books-tabs',
    priceInCents: 366000,  // $3,660
    type: 'bundle',
  },

  // ── Solar ─────────────────────────────────────────────────────────────────
  {
    category: 'Solar',
    name: 'Solar Basic Course',
    slug: 'solar-basic-course',
    priceInCents: 50000,   // $500
    type: 'course',
  },
  {
    category: 'Solar',
    name: 'Solar Complete Course',
    slug: 'solar-complete-course',
    priceInCents: 75000,   // $750
    type: 'course',
  },
  {
    category: 'Solar',
    name: 'Solar Complete Course + Books + Tabs',
    slug: 'solar-complete-course-books-tabs',
    priceInCents: 266000,  // $2,660
    type: 'bundle',
  },

  // ── Specialty Structure ───────────────────────────────────────────────────
  {
    category: 'Specialty Structure',
    name: 'Specialty Structure Basic Course',
    slug: 'specialty-structure-basic-course',
    priceInCents: 50000,   // $500
    type: 'course',
  },
  {
    category: 'Specialty Structure',
    name: 'Specialty Structure Complete Course',
    slug: 'specialty-structure-complete-course',
    priceInCents: 75000,   // $750
    type: 'course',
  },
  {
    category: 'Specialty Structure',
    name: 'Specialty Structure Complete Course + Books + Tabs',
    slug: 'specialty-structure-complete-course-books-tabs',
    priceInCents: 172500,  // $1,725
    type: 'bundle',
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

(async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  // Get tenant's encrypted Stripe secret key
  const billingConfig = await (prisma as any).tenantBillingConfig.findUnique({
    where: { tenant_id: TENANT_ID },
    select: { stripe_secret_key_hash: true },
  });

  if (!billingConfig?.stripe_secret_key_hash) {
    throw new Error(`No Stripe secret key found for tenant ${TENANT_ID}.`);
  }

  const stripe = new Stripe(decrypt(billingConfig.stripe_secret_key_hash), {
    apiVersion: '2025-04-30.basil' as any,
  });

  console.log(`\n🚀 Starting B2C seed for tenant: ${TENANT_ID}`);
  console.log(`📦 Products to create: ${PRODUCTS.length}`);
  console.log(`⏳ Access duration: ${ACCESS_DURATION_DAYS} days (12 months)\n`);

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const product of PRODUCTS) {
    try {
      // Idempotency check by slug
      const existing = await (prisma as any).product.findUnique({
        where: { tenant_id_slug: { tenant_id: TENANT_ID, slug: product.slug } },
      });

      if (existing) {
        console.log(`⏭️  Skipped (already exists): ${product.name}`);
        skipped++;
        continue;
      }

      // 1. Create product in Stripe
      const stripeProduct = await stripe.products.create({
        name: product.name,
        metadata: {
          tenant_id: TENANT_ID,
          slug: product.slug,
          category: product.category,
          type: product.type,
          billing_mode: 'one_time_exp',
        },
      });

      // 2. Create one-time price in Stripe (no recurring = one_time payment)
      const stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: product.priceInCents,
        currency: CURRENCY,
        metadata: {
          tenant_id: TENANT_ID,
          slug: product.slug,
          billing_mode: 'one_time_exp',
          access_duration_days: String(ACCESS_DURATION_DAYS),
        },
      });

      // 3. Persist Product in b2c_products
      const dbProduct = await (prisma as any).product.create({
        data: {
          tenant_id: TENANT_ID,
          stripe_product_id: stripeProduct.id,
          name: product.name,
          slug: product.slug,
          categories: [product.type, product.category.toLowerCase().replace(/\s+/g, '-')],
          active: true,
        },
      });

      // 4. Persist ProductPrice in b2c_product_prices
      await (prisma as any).productPrice.create({
        data: {
          tenant_id: TENANT_ID,
          stripe_price_id: stripePrice.id,
          product_id: dbProduct.id,
          name: '12-Month Access',
          billing_mode: 'one_time_exp',
          interval: null,
          interval_count: null,
          unit_amount: product.priceInCents,
          currency: CURRENCY,
          max_billing_cycles: null,
          access_duration_days: ACCESS_DURATION_DAYS,
          active: true,
        },
      });

      const priceFormatted = (product.priceInCents / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      });
      console.log(`✅ Created: [${product.category}] ${product.name} — ${priceFormatted} (${product.type}, ${ACCESS_DURATION_DAYS}d)`);
      created++;

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`❌ Error on "${product.name}": ${message}`);
      errors.push(`${product.name}: ${message}`);
    }
  }

  console.log(`\n─────────────────────────────────────────────────────`);
  console.log(`✅ Created : ${created}`);
  console.log(`⏭️  Skipped : ${skipped}`);
  console.log(`❌ Errors  : ${errors.length}`);
  if (errors.length > 0) {
    console.log('\nFailed products:');
    errors.forEach((e) => console.log(`  • ${e}`));
  }
  console.log(`─────────────────────────────────────────────────────\n`);

  await prisma.$disconnect();
})();
