/**
 * Script: seed-b2c-books-tabs.ts
 *
 * Creates B2C book-set and tabs products (one_time_exp, 12-month access) in Stripe
 * and persists them in the b2c_products + b2c_product_prices tables.
 *
 * NOTE: Prices below are the FINAL sale prices only (cost price is excluded).
 *
 * Run: pnpm exec ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed-b2c-books-tabs.ts
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
// priceInCents = FINAL sale price in USD × 100
// billing_mode = 'one_time_exp' — access expires after 12 months

type ProductType = 'book' | 'tabs';

interface B2CBookTabProduct {
  category: string;
  name: string;
  slug: string;
  priceInCents: number;
  type: ProductType;
}

const PRODUCTS: B2CBookTabProduct[] = [
  // ── Business and Finance ──────────────────────────────────────────────────
  {
    category: 'Business and Finance',
    name: 'Business and Finance Book Set',
    slug: 'business-and-finance-book-set',
    priceInCents: 1100,    // $11  — update to correct final price before running
    type: 'book',
  },
  {
    category: 'Business and Finance',
    name: 'Business and Finance Tabs',
    slug: 'business-and-finance-tabs',
    priceInCents: 4260,    // $42.60
    type: 'tabs',
  },

  // ── General Contractor ────────────────────────────────────────────────────
  {
    category: 'General Contractor',
    name: 'General Contractor Book Set',
    slug: 'general-contractor-book-set',
    priceInCents: 159500,  // $1,595
    type: 'book',
  },
  {
    category: 'General Contractor',
    name: 'General Contractor Tabs',
    slug: 'general-contractor-tabs',
    priceInCents: 15000,   // $150
    type: 'tabs',
  },

  // ── Building Contractor ───────────────────────────────────────────────────
  {
    category: 'Building Contractor',
    name: 'Building Contractor Book Set',
    slug: 'building-contractor-book-set',
    priceInCents: 159500,  // $1,595
    type: 'book',
  },
  {
    category: 'Building Contractor',
    name: 'Building Contractor Tabs',
    slug: 'building-contractor-tabs',
    priceInCents: 15000,   // $150
    type: 'tabs',
  },

  // ── Residential Contractor ────────────────────────────────────────────────
  {
    category: 'Residential Contractor',
    name: 'Residential Contractor Book Set',
    slug: 'residential-contractor-book-set',
    priceInCents: 159500,  // $1,595
    type: 'book',
  },
  {
    category: 'Residential Contractor',
    name: 'Residential Contractor Tabs',
    slug: 'residential-contractor-tabs',
    priceInCents: 15000,   // $150
    type: 'tabs',
  },

  // ── Roofing ───────────────────────────────────────────────────────────────
  {
    category: 'Roofing',
    name: 'Roofing Book Set',
    slug: 'roofing-book-set',
    priceInCents: 159500,  // $1,595
    type: 'book',
  },
  {
    category: 'Roofing',
    name: 'Roofing Tabs',
    slug: 'roofing-tabs',
    priceInCents: 15000,   // $150
    type: 'tabs',
  },

  // ── Plumbing ──────────────────────────────────────────────────────────────
  {
    category: 'Plumbing',
    name: 'Plumbing Book Set',
    slug: 'plumbing-book-set',
    priceInCents: 143000,  // $1,430
    type: 'book',
  },
  {
    category: 'Plumbing',
    name: 'Plumbing Tabs',
    slug: 'plumbing-tabs',
    priceInCents: 15000,   // $150
    type: 'tabs',
  },

  // ── Air A ─────────────────────────────────────────────────────────────────
  {
    category: 'Air A',
    name: 'Air A Book Set',
    slug: 'air-a-book-set',
    priceInCents: 187000,  // $1,870
    type: 'book',
  },
  {
    category: 'Air A',
    name: 'Air A Tabs',
    slug: 'air-a-tabs',
    priceInCents: 15000,   // $150
    type: 'tabs',
  },

  // ── Air B ─────────────────────────────────────────────────────────────────
  {
    category: 'Air B',
    name: 'Air B Book Set',
    slug: 'air-b-book-set',
    priceInCents: 187000,  // $1,870
    type: 'book',
  },
  {
    category: 'Air B',
    name: 'Air B Tabs',
    slug: 'air-b-tabs',
    priceInCents: 15000,   // $150
    type: 'tabs',
  },

  // ── Mechanical ────────────────────────────────────────────────────────────
  {
    category: 'Mechanical',
    name: 'Mechanical Book Set',
    slug: 'mechanical-book-set',
    priceInCents: 231000,  // $2,310
    type: 'book',
  },
  {
    category: 'Mechanical',
    name: 'Mechanical Tabs',
    slug: 'mechanical-tabs',
    priceInCents: 15000,   // $150
    type: 'tabs',
  },

  // ── Solar ─────────────────────────────────────────────────────────────────
  {
    category: 'Solar',
    name: 'Solar Book Set',
    slug: 'solar-book-set',
    priceInCents: 176000,  // $1,760
    type: 'book',
  },
  {
    category: 'Solar',
    name: 'Solar Tabs',
    slug: 'solar-tabs',
    priceInCents: 15000,   // $150
    type: 'tabs',
  },

  // ── Specialty Structure ───────────────────────────────────────────────────
  {
    category: 'Specialty Structure',
    name: 'Specialty Structure Book Set',
    slug: 'specialty-structure-book-set',
    priceInCents: 82500,   // $825
    type: 'book',
  },
  {
    category: 'Specialty Structure',
    name: 'Specialty Structure Tabs',
    slug: 'specialty-structure-tabs',
    priceInCents: 15000,   // $150
    type: 'tabs',
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

  console.log(`\n🚀 Starting B2C Books & Tabs seed for tenant: ${TENANT_ID}`);
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
