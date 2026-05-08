/**
 * Script: cleanup-individual-books.ts
 *
 * Removes ALL products seeded by:
 *   - seed-individual-books.ts  → B2B (b2b_products table)
 *   - seed-b2c-books-tabs.ts    → B2C (b2c_products + b2c_product_prices tables)
 *   - seed-b2c-courses.ts       → B2C (b2c_products + b2c_product_prices tables)
 *
 * For each product it archives the Stripe price(s) and product, then deletes from DB.
 *
 * Run: pnpm exec ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/cleanup-individual-books.ts
 */

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import Stripe from 'stripe';
import * as crypto from 'crypto';

const TENANT_ID = 'cmon7u18s0002fckgp42w2t0m';

// ─── B2B: identified by product name (b2b_products table) ────────────────────

const B2B_NAMES: string[] = [
  "2025 Florida Contractor's Manual",
  'Builders Guide to Accounting',
  'AIA Document A201 - 2017',
  'AIA Document A401 - 2017',
  'AIA Document A701 - 2018',
  'OSHA 1926',
  "Walker's Building Estimator's Reference Book, 33rd Edition",
  'NTC Red Book 2022',
  '2023 Key Word Index by Tom Henry',
  'Masonry and Sitework for the Residential Contractor',
  'BCSI Guide to Good Practice',
  'Concrete Manual, 2021/2024 IBC',
  'Carpentry and Building Construction 2016',
  'Design and Control of Concrete Mixtures, 16th Edition',
  'NFPA 70: National Electrical Code (NEC), 2020 Edition',
  "Plumber's Handbook Revised, 2023",
  'NRCA Roofing Manual - 2023 Boxed Set',
  'Refrigeration & Air Conditioning Technology, 9th Ed.',
  'Principles & Practices of Commercial Construction, 11th Edition',
  'Energy Efficient Building Construction in Florida, 11th Edition',
  '2023 Florida Building Code - Plumbing',
  '2023 Florida Building Code - Fuel Gas',
  '2023 Florida Building Code - Accessibility',
  '2023 Florida Building Code - Energy Conservation',
  '2023 Florida Building Code - Mechanical',
  '2023 Florida Building Code - Residential',
];

// ─── B2C: identified by slug (b2c_products + b2c_product_prices tables) ──────
// Covers: seed-b2c-books-tabs.ts + seed-b2c-courses.ts

const B2C_SLUGS: string[] = [
  // Books & Tabs (seed-b2c-books-tabs.ts)
  'business-and-finance-book-set',
  'business-and-finance-tabs',
  'general-contractor-book-set',
  'general-contractor-tabs',
  'building-contractor-book-set',
  'building-contractor-tabs',
  'residential-contractor-book-set',
  'residential-contractor-tabs',
  'roofing-book-set',
  'roofing-tabs',
  'plumbing-book-set',
  'plumbing-tabs',
  'air-a-book-set',
  'air-a-tabs',
  'air-b-book-set',
  'air-b-tabs',
  'mechanical-book-set',
  'mechanical-tabs',
  'solar-book-set',
  'solar-tabs',
  'specialty-structure-book-set',
  'specialty-structure-tabs',

  // Courses & Bundles (seed-b2c-courses.ts)
  'business-and-finance-basic-course',
  'business-and-finance-complete-course',
  'business-and-finance-complete-course-books-tabs',
  'general-contractor-basic-course',
  'general-contractor-complete-course',
  'general-contractor-complete-course-books-tabs',
  'building-contractor-basic-course',
  'building-contractor-complete-course',
  'building-contractor-complete-course-books-tabs',
  'residential-contractor-basic-course',
  'residential-contractor-complete-course',
  'residential-contractor-complete-course-books-tabs',
  'roofing-basic-course',
  'roofing-complete-course',
  'roofing-complete-course-books-tabs',
  'plumbing-complete-course-books-tabs',
  'air-a-basic-course',
  'air-a-complete-course',
  'air-a-complete-course-books-tabs',
  'air-b-basic-course',
  'air-b-complete-course',
  'air-b-complete-course-books-tabs',
  'mechanical-basic-course',
  'mechanical-complete-course',
  'mechanical-complete-course-books-tabs',
  'solar-basic-course',
  'solar-complete-course',
  'solar-complete-course-books-tabs',
  'specialty-structure-basic-course',
  'specialty-structure-complete-course',
  'specialty-structure-complete-course-books-tabs',
];

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function archiveStripePrice(stripe: Stripe, priceId: string): Promise<void> {
  try {
    await stripe.prices.update(priceId, { active: false });
    console.log(`   ↳ Archived Stripe price: ${priceId}`);
  } catch (e: unknown) {
    console.warn(`   ↳ Could not archive price ${priceId}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function archiveStripeProduct(stripe: Stripe, productId: string): Promise<void> {
  try {
    await stripe.products.update(productId, { active: false });
    console.log(`   ↳ Archived Stripe product: ${productId}`);
  } catch (e: unknown) {
    console.warn(`   ↳ Could not archive product ${productId}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

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

  console.log(`\n🧹 Cleanup for tenant: ${TENANT_ID}`);
  console.log(`📦 B2B products to remove : ${B2B_NAMES.length}`);
  console.log(`📦 B2C products to remove : ${B2C_SLUGS.length}\n`);

  // ── Phase 1: B2B (b2b_products) ─────────────────────────────────────────────

  console.log('═══════════════════════════════════════════════════════');
  console.log(' PHASE 1 — B2B products (b2b_products table)');
  console.log('═══════════════════════════════════════════════════════\n');

  let b2bRemoved = 0;
  let b2bNotFound = 0;

  for (const name of B2B_NAMES) {
    const product = await (prisma as any).b2BProduct.findFirst({
      where: { tenant_id: TENANT_ID, name },
    });

    if (!product) {
      console.log(`⏭️  Not found in DB (B2B): ${name}`);
      b2bNotFound++;
      continue;
    }

    await archiveStripePrice(stripe, product.stripe_price_id);
    await archiveStripeProduct(stripe, product.stripe_product_id);

    await (prisma as any).b2BProduct.delete({ where: { id: product.id } });

    console.log(`✅ Removed (B2B): ${name}`);
    b2bRemoved++;
  }

  // ── Phase 2: B2C (b2c_products + b2c_product_prices) ────────────────────────

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(' PHASE 2 — B2C products (product + productPrice tables)');
  console.log('═══════════════════════════════════════════════════════\n');

  let b2cRemoved = 0;
  let b2cNotFound = 0;

  for (const slug of B2C_SLUGS) {
    const product = await (prisma as any).product.findUnique({
      where: { tenant_id_slug: { tenant_id: TENANT_ID, slug } },
      include: { ProductPrice: true },
    });

    if (!product) {
      console.log(`⏭️  Not found in DB (B2C): ${slug}`);
      b2cNotFound++;
      continue;
    }

    for (const price of product.ProductPrice) {
      await archiveStripePrice(stripe, price.stripe_price_id);
    }

    await archiveStripeProduct(stripe, product.stripe_product_id);

    await (prisma as any).productPrice.deleteMany({ where: { product_id: product.id } });
    await (prisma as any).product.delete({ where: { id: product.id } });

    console.log(`✅ Removed (B2C): ${slug}`);
    b2cRemoved++;
  }

  // ── Summary ──────────────────────────────────────────────────────────────────

  console.log(`\n═══════════════════════════════════════════════════════`);
  console.log(` SUMMARY`);
  console.log(`═══════════════════════════════════════════════════════`);
  console.log(` B2B — Removed: ${b2bRemoved}  |  Not found: ${b2bNotFound}`);
  console.log(` B2C — Removed: ${b2cRemoved}  |  Not found: ${b2cNotFound}`);
  console.log(`═══════════════════════════════════════════════════════\n`);

  await prisma.$disconnect();
})();
