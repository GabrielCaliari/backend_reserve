#!/usr/bin/env ts-node
/**
 * Script para configurar as chaves do Stripe para um tenant
 * 
 * Uso:
 *   pnpm exec ts-node scripts/configure-tenant-stripe.ts <tenant_id> <stripe_secret_key> <stripe_publishable_key>
 * 
 * Exemplo:
 *   pnpm exec ts-node scripts/configure-tenant-stripe.ts cmodat4pt000030kg41fb255o sk_test_51... pk_test_51...
 */

import { PrismaClient } from '../src/generated/prisma/client';
import * as crypto from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new (PrismaClient as any)() as InstanceType<typeof PrismaClient>;

/**
 * Simple symmetric encryption for Stripe secret keys.
 * Uses AES-256-GCM with a key derived from JWT_SECRET.
 * MUST match the encryption in PrismaTenantBillingConfigRepository.
 */
function deriveEncryptionKey(jwtSecret: string): Buffer {
  return crypto.createHash('sha256').update(jwtSecret).digest();
}

function encrypt(plaintext: string, jwtSecret: string): string {
  const key = deriveEncryptionKey(jwtSecret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('❌ Uso incorreto!');
    console.error('');
    console.error('Uso:');
    console.error('  pnpm exec ts-node scripts/configure-tenant-stripe.ts <tenant_id> <stripe_secret_key> <stripe_publishable_key>');
    console.error('');
    console.error('Exemplo:');
    console.error('  pnpm exec ts-node scripts/configure-tenant-stripe.ts cmodat4pt000030kg41fb255o sk_test_51... pk_test_51...');
    console.error('');
    process.exit(1);
  }

  const [tenantId, stripeSecretKey, stripePublishableKey] = args;

  // Validar formato das chaves
  if (!stripeSecretKey.startsWith('sk_test_') && !stripeSecretKey.startsWith('sk_live_')) {
    console.error('❌ Erro: stripe_secret_key deve começar com sk_test_ ou sk_live_');
    process.exit(1);
  }

  if (!stripePublishableKey.startsWith('pk_test_') && !stripePublishableKey.startsWith('pk_live_')) {
    console.error('❌ Erro: stripe_publishable_key deve começar com pk_test_ ou pk_live_');
    process.exit(1);
  }

  console.log('🔍 Verificando tenant...');

  // Verificar se o tenant existe
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, slug: true },
  });

  if (!tenant) {
    console.error(`❌ Erro: Tenant ${tenantId} não encontrado`);
    process.exit(1);
  }

  console.log(`✅ Tenant encontrado: ${tenant.name} (${tenant.slug})`);
  console.log('');

  // Obter JWT_SECRET para criptografia
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('❌ Erro: JWT_SECRET não configurada no .env');
    process.exit(1);
  }

  console.log('🔐 Criptografando chaves do Stripe...');

  // Criptografar a secret key usando JWT_SECRET (mesmo método do repository)
  const encryptedSecretKey = encrypt(stripeSecretKey, jwtSecret);

  console.log('💾 Salvando configuração no banco...');

  // Criar ou atualizar a configuração de billing
  const billingConfig = await prisma.tenantBillingConfig.upsert({
    where: { tenant_id: tenantId },
    create: {
      tenant_id: tenantId,
      stripe_secret_key_hash: encryptedSecretKey,
      stripe_publishable_key: stripePublishableKey,
      active: true,
    },
    update: {
      stripe_secret_key_hash: encryptedSecretKey,
      stripe_publishable_key: stripePublishableKey,
      active: true,
      updated_at: new Date(),
    },
  });

  console.log('');
  console.log('✅ Configuração do Stripe salva com sucesso!');
  console.log('');
  console.log('📋 Detalhes:');
  console.log(`   Tenant ID: ${tenantId}`);
  console.log(`   Tenant: ${tenant.name} (${tenant.slug})`);
  console.log(`   Stripe Publishable Key: ${stripePublishableKey}`);
  console.log(`   Stripe Secret Key: ${stripeSecretKey.substring(0, 15)}...`);
  console.log(`   Config ID: ${billingConfig.id}`);
  console.log('');
  console.log('🎉 Agora você pode usar os endpoints do Stripe para este tenant!');
  console.log('');
}

main()
  .catch((error) => {
    console.error('❌ Erro ao configurar Stripe:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
