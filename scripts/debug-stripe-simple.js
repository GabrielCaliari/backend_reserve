#!/usr/bin/env node
/**
 * Script simples para debugar subscriptions do Stripe
 */

const { PrismaClient } = require('../dist/generated/prisma/client');
const Stripe = require('stripe');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Função para descriptografar
function decrypt(ciphertext) {
  const secret = process.env.JWT_SECRET ?? 'fallback-dev-secret-change-in-prod';
  const key = crypto.createHash('sha256').update(secret).digest();
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

async function main() {
  const tenantId = process.argv[2];

  if (!tenantId) {
    console.error('❌ Uso: node scripts/debug-stripe-simple.js <tenant_id>');
    process.exit(1);
  }

  console.log('🔍 Debugando subscriptions do Stripe...\n');

  // 1. Buscar tenant
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      stripe_customer_id: true,
    },
  });

  if (!tenant) {
    console.error(`❌ Tenant ${tenantId} não encontrado`);
    process.exit(1);
  }

  console.log('📦 Tenant:');
  console.log(`   ID: ${tenant.id}`);
  console.log(`   Nome: ${tenant.name}`);
  console.log(`   Slug: ${tenant.slug}`);
  console.log(`   Stripe Customer ID: ${tenant.stripe_customer_id || 'NÃO CONFIGURADO'}\n`);

  // 2. Buscar billing config
  const billingConfig = await prisma.tenantBillingConfig.findUnique({
    where: { tenant_id: tenantId },
    select: {
      stripe_secret_key_hash: true,
      stripe_publishable_key: true,
    },
  });

  if (!billingConfig?.stripe_secret_key_hash) {
    console.error('❌ Tenant não tem configuração do Stripe');
    process.exit(1);
  }

  console.log('🔐 Stripe Config:');
  console.log(`   Publishable Key: ${billingConfig.stripe_publishable_key}\n`);

  // 3. Descriptografar secret key
  const stripeSecretKey = decrypt(billingConfig.stripe_secret_key_hash);
  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-02-24.acacia' });

  // 4. Listar TODOS os customers
  console.log('👥 Listando customers no Stripe...');
  const customers = await stripe.customers.list({ limit: 100 });
  console.log(`   Total de customers: ${customers.data.length}\n`);

  customers.data.forEach((customer, index) => {
    console.log(`   Customer ${index + 1}:`);
    console.log(`      ID: ${customer.id}`);
    console.log(`      Email: ${customer.email || 'N/A'}`);
    console.log(`      Name: ${customer.name || 'N/A'}`);
    console.log(`      Metadata: ${JSON.stringify(customer.metadata)}\n`);
  });

  // 5. Listar TODAS as subscriptions
  console.log('🔍 Listando TODAS as subscriptions no Stripe...');
  const allSubscriptions = await stripe.subscriptions.list({ limit: 100 });
  console.log(`   Total de subscriptions: ${allSubscriptions.data.length}\n`);

  allSubscriptions.data.forEach((sub, index) => {
    console.log(`   Subscription ${index + 1}:`);
    console.log(`      ID: ${sub.id}`);
    console.log(`      Customer: ${sub.customer}`);
    console.log(`      Status: ${sub.status}`);
    console.log(`      Product: ${sub.items.data[0]?.price.product}`);
    console.log(`      Created: ${new Date(sub.created * 1000).toISOString()}`);
    
    if (sub.customer === tenant.stripe_customer_id) {
      console.log(`      ✅ ESTA É DO TENANT!`);
    } else {
      console.log(`      ⚠️  Customer diferente do tenant (esperado: ${tenant.stripe_customer_id})`);
    }
    console.log('');
  });

  // 6. Diagnóstico
  console.log('💡 Diagnóstico:\n');
  
  if (!tenant.stripe_customer_id) {
    console.log('   ❌ Tenant não tem stripe_customer_id configurado');
    console.log('   📝 Solução: Configure o customer ID correto no banco\n');
  } else {
    const tenantSubs = allSubscriptions.data.filter(s => s.customer === tenant.stripe_customer_id);
    
    if (tenantSubs.length === 0) {
      console.log('   ❌ Nenhuma subscription encontrada para o customer do tenant');
      console.log('   📝 A subscription foi criada para outro customer\n');
      console.log('   🔧 Solução:');
      console.log('      Encontre o customer correto acima e atualize o tenant:\n');
      console.log(`      UPDATE "Tenant" SET stripe_customer_id = '<customer_id_correto>' WHERE id = '${tenantId}';\n`);
    } else {
      console.log('   ✅ Subscriptions encontradas!');
      console.log(`   Total: ${tenantSubs.length}\n`);
    }
  }
}

main()
  .catch((error) => {
    console.error('❌ Erro:', error.message);
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
