/**
 * Script: cleanup-individual-books.ts
 *
 * Removes ALL products for the tenant from:
 *   - b2b_products table (B2B)
 *   - b2c_products + b2c_product_prices tables (B2C)
 *
 * Fetches every record directly from the DB by tenant_id — no hardcoded lists.
 * For each product it archives all Stripe price(s) and the product itself, then deletes from DB.
 *
 * Run: pnpm exec ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/cleanup-individual-books.ts
 */

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import Stripe from 'stripe';
import * as crypto from 'crypto';

const TENANT_ID = 'cmon7u18s0002fckgp42w2t0m';

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

  // ── Phase 1: B2B (b2b_products) ─────────────────────────────────────────────

  const b2bProducts = await (prisma as any).b2BProduct.findMany({
    where: { tenant_id: TENANT_ID },
  });

  console.log(`\n🧹 Cleanup for tenant: ${TENANT_ID}`);
  console.log(`📦 B2B products found in DB : ${b2bProducts.length}`);

  const b2cProducts = await (prisma as any).product.findMany({
    where: { tenant_id: TENANT_ID },
    include: { ProductPrice: true },
  });

  console.log(`📦 B2C products found in DB : ${b2cProducts.length}\n`);

  console.log('═══════════════════════════════════════════════════════');
  console.log(' PHASE 1 — B2B products (b2b_products table)');
  console.log('═══════════════════════════════════════════════════════\n');

  let b2bRemoved = 0;
  const b2bErrors: string[] = [];

  for (const product of b2bProducts) {
    try {
      await archiveStripePrice(stripe, product.stripe_price_id);
      await archiveStripeProduct(stripe, product.stripe_product_id);
      await (prisma as any).b2BProduct.delete({ where: { id: product.id } });
      console.log(`✅ Removed (B2B): ${product.name}`);
      b2bRemoved++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`❌ Error on B2B "${product.name}": ${msg}`);
      b2bErrors.push(`${product.name}: ${msg}`);
    }
  }

  // ── Phase 2: B2C (b2c_products + b2c_product_prices) ────────────────────────

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(' PHASE 2 — B2C products (product + productPrice tables)');
  console.log('═══════════════════════════════════════════════════════\n');

  let b2cRemoved = 0;
  const b2cErrors: string[] = [];

  for (const product of b2cProducts) {
    try {
      for (const price of product.ProductPrice) {
        await archiveStripePrice(stripe, price.stripe_price_id);
      }
      await archiveStripeProduct(stripe, product.stripe_product_id);
      await (prisma as any).productPrice.deleteMany({ where: { product_id: product.id } });
      await (prisma as any).product.delete({ where: { id: product.id } });
      console.log(`✅ Removed (B2C): ${product.slug}`);
      b2cRemoved++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`❌ Error on B2C "${product.slug}": ${msg}`);
      b2cErrors.push(`${product.slug}: ${msg}`);
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────────

  console.log(`\n═══════════════════════════════════════════════════════`);
  console.log(` SUMMARY`);
  console.log(`═══════════════════════════════════════════════════════`);
  console.log(` B2B — Removed: ${b2bRemoved}  |  Errors: ${b2bErrors.length}`);
  console.log(` B2C — Removed: ${b2cRemoved}  |  Errors: ${b2cErrors.length}`);
  if (b2bErrors.length > 0) {
    console.log('\nB2B failures:');
    b2bErrors.forEach((e) => console.log(`  • ${e}`));
  }
  if (b2cErrors.length > 0) {
    console.log('\nB2C failures:');
    b2cErrors.forEach((e) => console.log(`  • ${e}`));
  }
  console.log(`═══════════════════════════════════════════════════════\n`);

  await prisma.$disconnect();
})();
