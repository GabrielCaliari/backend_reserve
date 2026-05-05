/**
 * Script: cleanup-individual-books.ts
 *
 * Removes all Individual Books products (by slug) from DB and archives
 * their prices in Stripe, so they can be recreated correctly as one_time.
 *
 * Run: pnpm exec ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/cleanup-individual-books.ts
 */

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import Stripe from 'stripe';
import * as crypto from 'crypto';

const TENANT_ID = 'cmon7u18s0002fckgp42w2t0m';

const SLUGS = [
  '2025-florida-contractor-s-manual',
  'builders-guide-to-accounting',
  'aia-document-a201-2017',
  'aia-document-a401-2017',
  'aia-document-a701-2018',
  'osha-1926',
  'walker-s-building-estimator-s-reference-book-33rd-edition',
  'ntc-red-book-2022',
  '2023-key-word-index-by-tom-henry',
  'masonry-and-sitework-for-the-residential-contractor',
  'bcsi-guide-to-good-practice',
  'concrete-manual-2021-2024-ibc',
  'carpentry-and-building-construction-2016',
  'design-and-control-of-concrete-mixtures-16th-edition',
  'nfpa-70-national-electrical-code-nec-2020-edition',
  'plumber-s-handbook-revised-2023',
  'nrca-roofing-manual-2023-boxed-set',
  'refrigeration-air-conditioning-technology-9th-ed',
  'principles-practices-of-commercial-construction-11th-edition',
  'energy-efficient-building-construction-in-florida-11th-edition',
  '2023-florida-building-code-plumbing',
  '2023-florida-building-code-fuel-gas',
  '2023-florida-building-code-accessibility',
  '2023-florida-building-code-energy-conservation',
  '2023-florida-building-code-mechanical',
  '2023-florida-building-code-residential',
];

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
  console.log(`📦 Slugs to remove: ${SLUGS.length}\n`);

  let removed = 0;
  let notFound = 0;

  for (const slug of SLUGS) {
    const product = await (prisma as any).product.findUnique({
      where: { tenant_id_slug: { tenant_id: TENANT_ID, slug } },
      include: { ProductPrice: true },
    });

    if (!product) {
      console.log(`⏭️  Not found in DB: ${slug}`);
      notFound++;
      continue;
    }

    // Archive prices in Stripe
    for (const price of product.ProductPrice) {
      try {
        await stripe.prices.update(price.stripe_price_id, { active: false });
        console.log(`   ↳ Archived Stripe price: ${price.stripe_price_id}`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`   ↳ Could not archive price ${price.stripe_price_id}: ${msg}`);
      }
    }

    // Archive product in Stripe
    try {
      await stripe.products.update(product.stripe_product_id, { active: false });
      console.log(`   ↳ Archived Stripe product: ${product.stripe_product_id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`   ↳ Could not archive Stripe product ${product.stripe_product_id}: ${msg}`);
    }

    // Delete from DB (prices cascade via FK)
    await (prisma as any).productPrice.deleteMany({ where: { product_id: product.id } });
    await (prisma as any).product.delete({ where: { id: product.id } });

    console.log(`✅ Removed: ${slug}`);
    removed++;
  }

  console.log(`\n─────────────────────────────────────────────────────`);
  console.log(`✅ Removed   : ${removed}`);
  console.log(`⏭️  Not found : ${notFound}`);
  console.log(`─────────────────────────────────────────────────────\n`);

  await prisma.$disconnect();
})();
