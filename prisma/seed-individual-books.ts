/**
 * Script: seed-individual-books.ts
 *
 * Creates 26 Individual Books as B2B products (one-time, avulso) in Stripe
 * and persists them in the b2b_products table for tenant: cmon7u18s0002fckgp42w2t0m
 *
 * Run: pnpm exec ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed-individual-books.ts
 */

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import Stripe from 'stripe';
import * as crypto from 'crypto';

// ─── Config ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'cmon7u18s0002fckgp42w2t0m';
const CURRENCY = 'usd';

// ─── Stripe key decryption (mirrors prisma-tenant-billing-config.repository.ts) ──

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
// priceInCents = price in USD dollars × 100 (e.g. 47 dollars = 4700 cents)

interface BookProduct {
  name: string;
  slug: string;       // used as metadata only (B2B has no slug field)
  priceInCents: number;
  type: 'book' | 'other';
}

const PRODUCTS: BookProduct[] = [
  { name: "2025 Florida Contractor's Manual",                                    slug: '2025-florida-contractor-s-manual',                               priceInCents:  4700, type: 'book'  },
  { name: "Builders Guide to Accounting",                                        slug: 'builders-guide-to-accounting',                                  priceInCents:  6500, type: 'book'  },
  { name: "AIA Document A201 - 2017",                                            slug: 'aia-document-a201-2017',                                        priceInCents:  4600, type: 'other' },
  { name: "AIA Document A401 - 2017",                                            slug: 'aia-document-a401-2017',                                        priceInCents:  4600, type: 'other' },
  { name: "AIA Document A701 - 2018",                                            slug: 'aia-document-a701-2018',                                        priceInCents:  4600, type: 'other' },
  { name: "OSHA 1926",                                                           slug: 'osha-1926',                                                     priceInCents:  4700, type: 'book'  },
  { name: "Walker's Building Estimator's Reference Book, 33rd Edition",          slug: 'walker-s-building-estimator-s-reference-book-33rd-edition',     priceInCents:  1900, type: 'book'  },
  { name: "NTC Red Book 2022",                                                   slug: 'ntc-red-book-2022',                                             priceInCents: 20800, type: 'book'  },
  { name: "2023 Key Word Index by Tom Henry",                                    slug: '2023-key-word-index-by-tom-henry',                              priceInCents:  3800, type: 'book'  },
  { name: "Masonry and Sitework for the Residential Contractor",                 slug: 'masonry-and-sitework-for-the-residential-contractor',            priceInCents: 18800, type: 'book'  },
  { name: "BCSI Guide to Good Practice",                                         slug: 'bcsi-guide-to-good-practice',                                   priceInCents:  2000, type: 'book'  },
  { name: "Concrete Manual, 2021/2024 IBC",                                     slug: 'concrete-manual-2021-2024-ibc',                                 priceInCents:  2600, type: 'book'  },
  { name: "Carpentry and Building Construction 2016",                            slug: 'carpentry-and-building-construction-2016',                      priceInCents: 20800, type: 'book'  },
  { name: "Design and Control of Concrete Mixtures, 16th Edition",              slug: 'design-and-control-of-concrete-mixtures-16th-edition',           priceInCents:  1900, type: 'book'  },
  { name: "NFPA 70: National Electrical Code (NEC), 2020 Edition",              slug: 'nfpa-70-national-electrical-code-nec-2020-edition',              priceInCents: 15400, type: 'book'  },
  { name: "Plumber's Handbook Revised, 2023",                                   slug: 'plumber-s-handbook-revised-2023',                               priceInCents:  8700, type: 'book'  },
  { name: "NRCA Roofing Manual - 2023 Boxed Set",                               slug: 'nrca-roofing-manual-2023-boxed-set',                            priceInCents: 91000, type: 'book'  },
  { name: "Refrigeration & Air Conditioning Technology, 9th Ed.",               slug: 'refrigeration-air-conditioning-technology-9th-ed',               priceInCents:  1700, type: 'other' },
  { name: "Principles & Practices of Commercial Construction, 11th Edition",    slug: 'principles-practices-of-commercial-construction-11th-edition',   priceInCents:  1900, type: 'book'  },
  { name: "Energy Efficient Building Construction in Florida, 11th Edition",    slug: 'energy-efficient-building-construction-in-florida-11th-edition',  priceInCents:  1900, type: 'book'  },
  { name: "2023 Florida Building Code - Plumbing",                              slug: '2023-florida-building-code-plumbing',                            priceInCents:  1700, type: 'book'  },
  { name: "2023 Florida Building Code - Fuel Gas",                              slug: '2023-florida-building-code-fuel-gas',                            priceInCents:  1700, type: 'book'  },
  { name: "2023 Florida Building Code - Accessibility",                         slug: '2023-florida-building-code-accessibility',                       priceInCents:  1700, type: 'book'  },
  { name: "2023 Florida Building Code - Energy Conservation",                   slug: '2023-florida-building-code-energy-conservation',                 priceInCents:  1700, type: 'book'  },
  { name: "2023 Florida Building Code - Mechanical",                            slug: '2023-florida-building-code-mechanical',                          priceInCents:  1700, type: 'book'  },
  { name: "2023 Florida Building Code - Residential",                           slug: '2023-florida-building-code-residential',                         priceInCents:  6500, type: 'book'  },
];

function buildCategories(type: 'book' | 'other'): string[] {
  if (type === 'book') return ['book', 'avulso'];
  return ['book', 'avulso', 'other'];
}

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

  console.log(`\n🚀 Starting B2B seed for tenant: ${TENANT_ID}`);
  console.log(`📦 Products to create: ${PRODUCTS.length}\n`);

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const product of PRODUCTS) {
    try {
      // Check if already exists by name (idempotent)
      const existing = await (prisma as any).b2BProduct.findFirst({
        where: { tenant_id: TENANT_ID, name: product.name },
      });

      if (existing) {
        console.log(`⏭️  Skipped (already exists): ${product.name}`);
        skipped++;
        continue;
      }

      // Create product in Stripe
      const stripeProduct = await stripe.products.create({
        name: product.name,
        metadata: { tenant_id: TENANT_ID, slug: product.slug, type: product.type },
      });

      // Create one-time price in Stripe (no recurring field = one_time)
      const stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: product.priceInCents,
        currency: CURRENCY,
        metadata: { tenant_id: TENANT_ID, slug: product.slug },
      });

      const categories = buildCategories(product.type);

      // Persist in b2b_products table
      await (prisma as any).b2BProduct.create({
        data: {
          tenant_id: TENANT_ID,
          stripe_product_id: stripeProduct.id,
          stripe_price_id: stripePrice.id,
          name: product.name,
          categories,
          price: product.priceInCents,
          currency: CURRENCY,
          active: true,
        },
      });

      const priceFormatted = (product.priceInCents / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      });
      console.log(`✅ Created: ${product.name} — ${priceFormatted} [${categories.join(', ')}]`);
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
