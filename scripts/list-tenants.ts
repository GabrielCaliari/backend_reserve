#!/usr/bin/env ts-node
/**
 * Script para listar todos os tenants
 * 
 * Uso:
 *   pnpm exec ts-node scripts/list-tenants.ts
 */

import { PrismaClient } from '../src/generated/prisma/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new (PrismaClient as any)() as InstanceType<typeof PrismaClient>;

async function main() {
  console.log('📋 Listando tenants...');
  console.log('');

  const tenants = await prisma.tenant.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      slug: true,
      stripe_customer_id: true,
      subscription_status: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
  });

  if (tenants.length === 0) {
    console.log('⚠️  Nenhum tenant encontrado');
    return;
  }

  console.log(`✅ ${tenants.length} tenant(s) encontrado(s):`);
  console.log('');

  for (const tenant of tenants) {
    console.log(`📦 ${tenant.name}`);
    console.log(`   ID: ${tenant.id}`);
    console.log(`   Slug: ${tenant.slug}`);
    console.log(`   Stripe Customer: ${tenant.stripe_customer_id || 'não configurado'}`);
    console.log(`   Status Subscription: ${tenant.subscription_status}`);
    console.log(`   Criado em: ${tenant.created_at.toISOString()}`);
    console.log('');
  }

  // Verificar quais tenants têm configuração do Stripe
  console.log('🔍 Verificando configurações do Stripe...');
  console.log('');

  const billingConfigs = await prisma.tenantBillingConfig.findMany({
    where: {
      tenant_id: { in: tenants.map(t => t.id) },
      stripe_secret_key_hash: { not: null },
    },
    select: {
      tenant_id: true,
      stripe_publishable_key: true,
      active: true,
    },
  });

  const tenantsWithStripe = new Set(billingConfigs.map(c => c.tenant_id));

  for (const tenant of tenants) {
    const hasStripe = tenantsWithStripe.has(tenant.id);
    const config = billingConfigs.find(c => c.tenant_id === tenant.id);
    
    console.log(`${hasStripe ? '✅' : '❌'} ${tenant.name} (${tenant.slug})`);
    
    if (hasStripe && config) {
      console.log(`   Stripe configurado: ${config.stripe_publishable_key}`);
      console.log(`   Status: ${config.active ? 'ativo' : 'inativo'}`);
    } else {
      console.log(`   Stripe: não configurado`);
      console.log(`   Configure com: pnpm exec ts-node scripts/configure-tenant-stripe.ts ${tenant.id} <secret_key> <publishable_key>`);
    }
    console.log('');
  }
}

main()
  .catch((error) => {
    console.error('❌ Erro ao listar tenants:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
