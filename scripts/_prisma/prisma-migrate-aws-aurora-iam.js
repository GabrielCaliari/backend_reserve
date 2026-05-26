require('dotenv/config');

const { execSync } = require('child_process');
const { Signer } = require('@aws-sdk/rds-signer');

async function main() {
  const host =
    'reserve-admin-io-instance.ce9eq8ymw8sv.us-east-1.rds.amazonaws.com';

  const port = 5432;
  const user = 'backend_reserve-api_user';
  const database = 'postgres';
  const region = 'us-east-1';

  const signer = new Signer({
    region,
    hostname: host,
    port,
    username: user,
  });

  const token = await signer.getAuthToken();

  const encodedToken = encodeURIComponent(token);

  process.env.DATABASE_URL =
    `postgresql://${user}:${encodedToken}` +
    `@${host}:${port}/${database}` +
    `?sslmode=require`;

  console.log('🚀 Running Prisma migrate deploy...\n');

  execSync('pnpm exec prisma migrate deploy', {
    stdio: 'inherit',
    env: process.env,
  });
}

main().catch(console.error);