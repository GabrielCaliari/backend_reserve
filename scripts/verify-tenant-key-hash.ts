#!/usr/bin/env ts-node
/**
 * Verification script for tenant key hashing
 * 
 * This script helps verify that tenant keys are hashed correctly
 * and can be used to debug authentication issues.
 * 
 * Usage:
 *   pnpm exec ts-node scripts/verify-tenant-key-hash.ts <tenant-key>
 * 
 * Example:
 *   pnpm exec ts-node scripts/verify-tenant-key-hash.ts abp_secret_2026_fl_pavers_secure
 */

import 'dotenv/config';
import * as crypto from 'crypto';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function verifyTenantKey(tenantKey: string) {
  console.log('\n=== Tenant Key Verification ===\n');
  console.log(`Testing key: ${tenantKey}`);
  
  const privateKey = process.env.ENCRYPT_PRIVATE_KEY;
  if (!privateKey) {
    console.error('ERROR: ENCRYPT_PRIVATE_KEY not set in environment');
    process.exit(1);
  }

  // Fetch all active collections
  const collections = await prisma.leadCollection.findMany({
    where: { active: true },
    include: { Tenant: true },
  });

  console.log(`\nFound ${collections.length} active collections\n`);

  let matchFound = false;

  for (const collection of collections) {
    if (!collection.secret_key_hash || !collection.secret_key_salt) {
      console.log(`⊘ ${collection.name} (${collection.slug})`);
      console.log(`  No secret key configured\n`);
      continue;
    }

    // Hash the provided key with the collection's salt
    const hash = crypto
      .pbkdf2Sync(tenantKey, collection.secret_key_salt + privateKey, 856, 64, 'sha512')
      .toString('hex');

    const matches = hash === collection.secret_key_hash;

    if (matches) {
      matchFound = true;
      console.log(`✓ MATCH FOUND: ${collection.name}`);
      console.log(`  Slug: ${collection.slug}`);
      console.log(`  Tenant: ${collection.Tenant.name} (${collection.Tenant.slug})`);
      console.log(`  Collection ID: ${collection.id}`);
      console.log(`  Tenant ID: ${collection.tenant_id}`);
      console.log(`  Source: ${collection.source}`);
      console.log(`  Access Mode: ${collection.access_mode}`);
      console.log(`  Allowed Domains: ${collection.allowed_domains.join(', ') || 'none'}`);
      console.log(`\n  Generated Hash: ${hash.substring(0, 32)}...`);
      console.log(`  Stored Hash:    ${collection.secret_key_hash.substring(0, 32)}...\n`);
    } else {
      console.log(`✗ ${collection.name} (${collection.slug})`);
      console.log(`  Tenant: ${collection.Tenant.name}`);
      console.log(`  Hash mismatch\n`);
    }
  }

  if (!matchFound) {
    console.log('❌ No matching collection found for this tenant key\n');
    console.log('Possible issues:');
    console.log('  1. Wrong tenant key provided');
    console.log('  2. Collection not seeded in database');
    console.log('  3. Collection is inactive');
    console.log('  4. ENCRYPT_PRIVATE_KEY mismatch between seed and runtime\n');
    process.exit(1);
  } else {
    console.log('✅ Authentication would succeed with this tenant key\n');
  }

  await prisma.$disconnect();
}

// Get tenant key from command line
const tenantKey = process.argv[2];

if (!tenantKey) {
  console.error('Usage: pnpm exec ts-node scripts/verify-tenant-key-hash.ts <tenant-key>');
  console.error('Example: pnpm exec ts-node scripts/verify-tenant-key-hash.ts abp_secret_2026_fl_pavers_secure');
  process.exit(1);
}

verifyTenantKey(tenantKey).catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
