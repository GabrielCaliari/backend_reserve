require('dotenv/config');

const fs = require('fs');
const { Signer } = require('@aws-sdk/rds-signer');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');
const { Pool } = require('pg');

async function debugEnvironment() {
  console.log('\n========== DEBUG ENV ==========');

  console.log({
    cwd: process.cwd(),
    envExists: fs.existsSync('.env'),

    AWS_REGION: process.env.AWS_REGION,

    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID
      ? `${process.env.AWS_ACCESS_KEY_ID.substring(0, 6)}...`
      : 'NOT SET',

    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY
      ? 'SET'
      : 'NOT SET',

    AWS_SESSION_TOKEN: process.env.AWS_SESSION_TOKEN
      ? 'SET'
      : 'NOT SET',

    IAM_TOKEN: process.env.IAM_TOKEN
      ? 'SET'
      : 'NOT SET',
  });

  console.log('================================\n');
}

async function debugAwsCredentials() {
  console.log('\n========== DEBUG AWS CREDS ==========');

  try {
    const provider = defaultProvider();

    const creds = await provider();

    console.log('✅ AWS credentials carregadas');

    console.log({
      accessKeyId: creds.accessKeyId,
      hasSecretAccessKey: !!creds.secretAccessKey,
      hasSessionToken: !!creds.sessionToken,
      expiration: creds.expiration || 'N/A',
    });
  } catch (err) {
    console.error('❌ Falha ao carregar credenciais AWS');
    console.error(err);
  }

  console.log('=====================================\n');
}

async function test() {
  await debugEnvironment();
  await debugAwsCredentials();

  const host =
    'zarp-admin-io-instance.ce9eq8ymw8sv.us-east-1.rds.amazonaws.com';

  const user = 'backend_zarp-api_user';

  console.log(
    `Tentando conectar em: ${host} com o usuário: ${user}`
  );

  const manualToken = process.env.IAM_TOKEN;

  if (manualToken) {
    console.log('⚠️ Usando IAM_TOKEN manual do .env');
    await testWithToken(host, user, manualToken);
    return;
  }

  const signer = new Signer({
    region: 'us-east-1',
    hostname: host,
    port: 5432,
    username: user,
  });

  try {
    console.log('\n========== GERANDO TOKEN ==========');

    const token = await signer.getAuthToken();

    console.log('✅ Token IAM gerado');

    console.log({
      tokenLength: token?.length,
      tokenStart: token?.substring(0, 80),
    });

    console.log('===================================\n');

    await testWithToken(host, user, token);
  } catch (err) {
    console.error('\n❌ ERRO AO GERAR TOKEN');
    console.error(err);

    if (err.message?.includes('credentials')) {
      console.log(
        '\n👉 Parece que o AWS SDK não encontrou credenciais válidas.'
      );
    }

    if (err.message?.includes('region')) {
      console.log(
        '\n👉 Parece que a região AWS não foi definida corretamente.'
      );
    }
  }
}

async function testWithToken(host, user, token) {
  console.log('\n========== TESTANDO CONEXÃO ==========');

  const pool = new Pool({
    host,
    port: 5432,
    user,
    database: 'postgres',
    password: token,

    ssl: {
      rejectUnauthorized: false,
    },

    connectionTimeoutMillis: 10000,
  });

  try {
    const res = await pool.query(`
      SELECT
        now(),
        current_user,
        current_database(),
        inet_server_addr(),
        version()
    `);

    console.log('\n🚀 SUCESSO ABSOLUTO!\n');

    console.log(res.rows[0]);
  } catch (err) {
    console.error('\n❌ ERRO DE CONEXÃO');

    console.error({
      message: err.message,
      code: err.code,
      detail: err.detail,
      stack: err.stack,
    });

    if (err.message?.includes('PAM')) {
      console.log(`
👉 IAM auth provavelmente NÃO está habilitado para o usuário.

Execute no Aurora:

GRANT rds_iam TO backend_api_user;
      `);
    }

    if (err.message?.includes('password authentication failed')) {
      console.log(`
👉 Token IAM inválido OU expirado.
👉 Também pode ser credencial AWS errada.
      `);
    }

    if (err.message?.includes('no pg_hba.conf entry')) {
      console.log(`
👉 SSL obrigatório ou Security Group bloqueando.
      `);
    }
  } finally {
    await pool.end();
  }

  console.log('======================================\n');
}

test();