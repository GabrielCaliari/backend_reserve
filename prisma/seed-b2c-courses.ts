/**
 * Script: seed-b2c-courses.ts
 *
 * Creates B2C course and bundle products (one_time_exp, 12-month access) in Stripe
 * and persists them in the b2c_products + b2c_product_prices tables.
 *
 * Product types:
 *   basic-course            → digital (requires_shipping: false)
 *   complete-course         → digital (requires_shipping: false)
 *   bundle-course-book-tabs → physical (requires_shipping: true)
 *
 * Idempotency: checked by slug (unique per tenant).
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

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductType = 'basic-course' | 'complete-course' | 'bundle-course-book-tabs';

interface B2CProduct {
  name: string;
  slug: string;
  priceInCents: number;
  type: ProductType;
  description: string | null;
}

const PHYSICAL_TYPES: ProductType[] = ['bundle-course-book-tabs'];

// ─── Product list ─────────────────────────────────────────────────────────────

const PRODUCTS: B2CProduct[] = [

  // ── Basic Courses ───────────────────────────────────────────────────────────

  {
    name: 'Air A Basic Course',
    slug: 'air-a-basic-course',
    priceInCents: 80000,
    type: 'basic-course',
    description: null,
  },
  {
    name: 'Air B Basic Course',
    slug: 'air-b-basic-course',
    priceInCents: 80000,
    type: 'basic-course',
    description: null,
  },
  {
    name: 'Building Contractor Basic Course',
    slug: 'building-contractor-basic-course',
    priceInCents: 80000,
    type: 'basic-course',
    description: null,
  },
  {
    name: 'Business and Finance Basic Course',
    slug: 'business-and-finance-basic-course',
    priceInCents: 30000,
    type: 'basic-course',
    description: null,
  },
  {
    name: 'General Contractor Basic Course',
    slug: 'general-contractor-basic-course',
    priceInCents: 80000,
    type: 'basic-course',
    description: null,
  },
  {
    name: 'Mechanical Basic Course',
    slug: 'mechanical-basic-course',
    priceInCents: 80000,
    type: 'basic-course',
    description: null,
  },
  {
    name: 'Residential Contractor Basic Course',
    slug: 'residential-contractor-basic-course',
    priceInCents: 80000,
    type: 'basic-course',
    description: null,
  },
  {
    name: 'Roofing Basic Course',
    slug: 'roofing-basic-course',
    priceInCents: 50000,
    type: 'basic-course',
    description: null,
  },
  {
    name: 'Solar Basic Course',
    slug: 'solar-basic-course',
    priceInCents: 50000,
    type: 'basic-course',
    description: null,
  },
  {
    name: 'Specialty Structure Basic Course',
    slug: 'specialty-structure-basic-course',
    priceInCents: 50000,
    type: 'basic-course',
    description: null,
  },

  // ── Complete Courses ────────────────────────────────────────────────────────

  {
    name: 'Air A Complete Course',
    slug: 'air-a-complete-course',
    priceInCents: 120000,
    type: 'complete-course',
    description: null,
  },
  {
    name: 'Air B Complete Course',
    slug: 'air-b-complete-course',
    priceInCents: 120000,
    type: 'complete-course',
    description: null,
  },
  {
    name: 'Building Contractor Complete Course',
    slug: 'building-contractor-complete-course',
    priceInCents: 120000,
    type: 'complete-course',
    description: null,
  },
  {
    name: 'Business and Finance Complete Course',
    slug: 'business-and-finance-complete-course',
    priceInCents: 45000,
    type: 'complete-course',
    description: null,
  },
  {
    name: 'General Contractor Complete Course',
    slug: 'general-contractor-complete-course',
    priceInCents: 120000,
    type: 'complete-course',
    description: null,
  },
  {
    name: 'Mechanical Complete Course',
    slug: 'mechanical-complete-course',
    priceInCents: 120000,
    type: 'complete-course',
    description: null,
  },
  {
    name: 'Residential Contractor Complete Course',
    slug: 'residential-contractor-complete-course',
    priceInCents: 120000,
    type: 'complete-course',
    description: null,
  },
  {
    name: 'Roofing Complete Course',
    slug: 'roofing-complete-course',
    priceInCents: 75000,
    type: 'complete-course',
    description: null,
  },
  {
    name: 'Solar Complete Course',
    slug: 'solar-complete-course',
    priceInCents: 75000,
    type: 'complete-course',
    description: null,
  },
  {
    name: 'Specialty Structure Complete Course',
    slug: 'specialty-structure-complete-course',
    priceInCents: 75000,
    type: 'complete-course',
    description: null,
  },

  // ── Bundle Course + Books + Tabs ────────────────────────────────────────────

  {
    name: 'Air A Complete Course + Books + Tabs',
    slug: 'air-a-complete-course-books-tabs',
    priceInCents: 322000,
    type: 'bundle-course-book-tabs',
    description: null,
  },
  {
    name: 'Air B Complete Course + Books + Tabs',
    slug: 'air-b-complete-course-books-tabs',
    priceInCents: 322000,
    type: 'bundle-course-book-tabs',
    description: null,
  },
  {
    name: 'Building Contractor Complete Course + Books + Tabs',
    slug: 'building-contractor-complete-course-books-tabs',
    priceInCents: 294500,
    type: 'bundle-course-book-tabs',
    description: null,
  },
  {
    name: 'Business and Finance Complete Course + Books + Tabs',
    slug: 'business-and-finance-complete-course-books-tabs',
    priceInCents: 82100,
    type: 'bundle-course-book-tabs',
    description: null,
  },
  {
    name: 'General Contractor Complete Course + Books + Tabs',
    slug: 'general-contractor-complete-course-books-tabs',
    priceInCents: 294500,
    type: 'bundle-course-book-tabs',
    description: null,
  },
  {
    name: 'Mechanical Complete Course + Books + Tabs',
    slug: 'mechanical-complete-course-books-tabs',
    priceInCents: 366000,
    type: 'bundle-course-book-tabs',
    description: null,
  },
  {
    name: 'Plumbing Complete Course + Books + Tabs',
    slug: 'plumbing-complete-course-books-tabs',
    priceInCents: 520000,
    type: 'bundle-course-book-tabs',
    description: null,
  },
  {
    name: 'Residential Contractor Complete Course + Books + Tabs',
    slug: 'residential-contractor-complete-course-books-tabs',
    priceInCents: 294500,
    type: 'bundle-course-book-tabs',
    description: null,
  },
  {
    name: 'Roofing Complete Course + Books + Tabs',
    slug: 'roofing-complete-course-books-tabs',
    priceInCents: 249500,
    type: 'bundle-course-book-tabs',
    description: null,
  },
  {
    name: 'Solar Complete Course + Books + Tabs',
    slug: 'solar-complete-course-books-tabs',
    priceInCents: 266000,
    type: 'bundle-course-book-tabs',
    description: null,
  },
  {
    name: 'Specialty Structure Complete Course + Books + Tabs',
    slug: 'specialty-structure-complete-course-books-tabs',
    priceInCents: 172500,
    type: 'bundle-course-book-tabs',
    description: null,
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

(async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

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

  const byType = PRODUCTS.reduce<Record<string, number>>((acc, p) => {
    acc[p.type] = (acc[p.type] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`\n🚀 Starting B2C seed for tenant: ${TENANT_ID}`);
  console.log(`📦 Total products: ${PRODUCTS.length}`);
  Object.entries(byType).forEach(([type, count]) => console.log(`   • ${type}: ${count}`));
  console.log(`⏳ Access duration: ${ACCESS_DURATION_DAYS} days (12 months)\n`);

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const product of PRODUCTS) {
    try {
      const existing = await (prisma as any).product.findUnique({
        where: { tenant_id_slug: { tenant_id: TENANT_ID, slug: product.slug } },
      });

      if (existing) {
        console.log(`⏭️  Skipped (already exists): ${product.name}`);
        skipped++;
        continue;
      }

      const requiresShipping = PHYSICAL_TYPES.includes(product.type);

      // 1. Create product in Stripe
      const stripeProduct = await stripe.products.create({
        name: product.name,
        ...(product.description ? { description: product.description } : {}),
        metadata: {
          tenant_id: TENANT_ID,
          slug: product.slug,
          type: product.type,
          billing_mode: 'one_time_exp',
          requires_shipping: String(requiresShipping),
        },
      });

      // 2. Create one-time price in Stripe
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

      // 3. Persist in b2c_products
      const dbProduct = await (prisma as any).product.create({
        data: {
          tenant_id: TENANT_ID,
          stripe_product_id: stripeProduct.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          categories: [product.type],
          requires_shipping: requiresShipping,
          active: true,
        },
      });

      // 4. Persist in b2c_product_prices
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
      const shipping = requiresShipping ? '📦 physical' : '💻 digital';
      console.log(`✅ Created: ${product.name} — ${priceFormatted} [${product.type}] ${shipping}`);
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
