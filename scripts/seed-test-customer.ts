#!/usr/bin/env ts-node
/**
 * Script para criar um Customer de teste e gerar o token de ativação.
 * Simula o fluxo completo: lead criado → token gerado → pronto para ativar.
 *
 * Uso:
 *   pnpm exec ts-node scripts/seed-test-customer.ts <tenant_id> [email] [nome]
 *
 * Exemplo:
 *   pnpm exec ts-node scripts/seed-test-customer.ts cm123abc teste@email.com "João Teste"
 *
 * Após rodar, ative a conta com:
 *   POST /licensefix/auth/activate  { "token": "<token>", "password": "SuaSenha123!" }
 *
 * E faça login com:
 *   POST /licensefix/auth/login  { "tenant_id": "<tenant_id>", "email": "<email>", "password": "SuaSenha123!" }
 */

import * as crypto from 'crypto';
import { PrismaClient } from '../src/generated/prisma/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new (PrismaClient as any)() as InstanceType<typeof PrismaClient>;

async function main() {
  const tenantId = process.argv[2];
  const email = process.argv[3] ?? 'teste-customer@licensefix.com';
  const name = process.argv[4] ?? 'Cliente Teste';

  if (!tenantId) {
    console.error('❌ Informe o tenant_id como primeiro argumento.');
    console.error('   Uso: pnpm exec ts-node scripts/seed-test-customer.ts <tenant_id>');
    console.error('   Para listar tenants: pnpm exec ts-node scripts/list-tenants.ts');
    process.exit(1);
  }

  console.log('🔍 Verificando tenant...');
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true } });
  if (!tenant) {
    console.error(`❌ Tenant "${tenantId}" não encontrado.`);
    process.exit(1);
  }
  console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`);
  console.log('');

  // Limpar customer de teste anterior com o mesmo email+tenant se existir
  const existing = await prisma.customer.findUnique({
    where: { tenant_id_email: { tenant_id: tenantId, email } },
    select: { id: true },
  });

  if (existing) {
    console.log(`⚠️  Customer com email "${email}" já existe neste tenant.`);
    console.log(`   ID: ${existing.id}`);
    console.log('   Gerando novo token de ativação para ele...');
    console.log('');

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    await prisma.activationToken.create({
      data: {
        customer_id: existing.id,
        tenant_id: tenantId,
        token: rawToken,
        type: 'ACTIVATION',
        expires_at: expiresAt,
      },
    });

    printResult(existing.id, tenantId, email, rawToken);
    return;
  }

  console.log(`📝 Criando Customer: ${name} <${email}>...`);

  const customer = await prisma.customer.create({
    data: {
      tenant_id: tenantId,
      email,
      name,
      phone_number: null,
    },
  });

  console.log(`✅ Customer criado: ${customer.id}`);
  console.log('');

  console.log('🔑 Gerando token de ativação...');
  const rawToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);

  await prisma.activationToken.create({
    data: {
      customer_id: customer.id,
      tenant_id: tenantId,
      token: rawToken,
      type: 'ACTIVATION',
      expires_at: expiresAt,
    },
  });

  printResult(customer.id, tenantId, email, rawToken);
}

function printResult(customerId: string, tenantId: string, email: string, token: string) {
  console.log('✅ Token criado. Dados para teste:');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Customer ID : ${customerId}`);
  console.log(`  Tenant ID   : ${tenantId}`);
  console.log(`  Email       : ${email}`);
  console.log(`  Token       : ${token}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📌 Passo 1 — Ativar conta (criar senha):');
  console.log('   POST /licensefix/auth/activate');
  console.log(`   { "token": "${token}", "password": "SuaSenha123!" }`);
  console.log('');
  console.log('📌 Passo 2 — Login:');
  console.log('   POST /licensefix/auth/login');
  console.log(`   { "tenant_id": "${tenantId}", "email": "${email}", "password": "SuaSenha123!" }`);
  console.log('');
}

main()
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
