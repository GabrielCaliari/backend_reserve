/**
 * Cria o primeiro super_admin no banco de dados.
 *
 * Uso:
 *   pnpm exec ts-node scripts/create-super-admin.ts <email> <senha> <nome>
 *
 * Exemplo:
 *   pnpm exec ts-node scripts/create-super-admin.ts tech@GabrielCaliari.com MinhaSenh@123 "Gabriel"
 */

import 'dotenv/config';
import * as crypto from 'crypto';

const ITERATIONS = 856;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

function hashPassword(value: string): { hash: string; salt: string } {
  const privateKey = process.env.ENCRYPT_PRIVATE_KEY;
  if (!privateKey) throw new Error('ENCRYPT_PRIVATE_KEY não definida no .env');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(value, salt + privateKey, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return { hash, salt };
}

function cuid(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(10).toString('base64url').substring(0, 14);
  return `c${timestamp}${random}`.substring(0, 25);
}

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] ?? 'Super Admin';

  if (!email || !password) {
    console.error('❌ Uso: pnpm exec ts-node scripts/create-super-admin.ts <email> <senha> [nome]');
    process.exit(1);
  }

  const { Client } = await import('pg');
  const isProduction = process.env.NODE_ENV === 'production';
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  });
  await client.connect();

  try {
    // Verificar se já existe
    const existing = await client.query('SELECT id, email FROM "Admin" WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.log(`⚠️  Admin com email "${email}" já existe (ID: ${existing.rows[0].id})`);
      console.log('   Se quiser redefinir a senha, use o endpoint PATCH /admin/:id');
      return;
    }

    const adminId = cuid();
    const credentialId = cuid();
    const { hash, salt } = hashPassword(password);
    const now = new Date().toISOString();

    await client.query('BEGIN');

    await client.query(
      `INSERT INTO "Admin" (id, name, email, role, active, created_at, updated_at)
       VALUES ($1, $2, $3, 'super_admin', true, $4, $4)`,
      [adminId, name, email, now],
    );

    await client.query(
      `INSERT INTO "AdminCredential" (id, admin_id, hash, salt, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $5)`,
      [credentialId, adminId, hash, salt, now],
    );

    await client.query('COMMIT');

    console.log('');
    console.log('✅ Super admin criado com sucesso!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   ID    : ${adminId}`);
    console.log(`   Nome  : ${name}`);
    console.log(`   Email : ${email}`);
    console.log(`   Role  : super_admin`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📌 Teste o login:');
    console.log(`   POST /api/admin/authenticate`);
    console.log(`   { "email": "${email}", "password": "${password}" }`);
    console.log('');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('❌ Erro:', error.message);
  process.exit(1);
});
