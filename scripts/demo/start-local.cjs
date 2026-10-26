/**
 * Sobe a API apontando para o banco local de demonstracao, nunca para a Neon.
 *
 * O .env do repositorio aponta para PRODUCAO e os crons escrevem ao subir, entao
 * este launcher fixa DATABASE_URL/REDIS antes do Nest ler o .env (o ConfigModule
 * nao sobrescreve variavel ja definida no processo).
 *
 * Compila (nest build) e roda dist/main.js NESTE processo, sem filho: parar o
 * launcher para a API. Com processo filho, um stop no Windows deixava a porta
 * presa por um orfao rodando codigo velho.
 *
 * Pre-requisito: containers reserve-test-pg (15432) e reserve-test-redis (16379)
 * de pe, com o banco reserve_demo migrado. Ver scripts/demo/README.md.
 *
 * Uso: node scripts/demo/start-local.cjs [--port 3002] [--no-build]
 */
const { spawnSync } = require('child_process');
const path = require('path');

const portArg = process.argv.indexOf('--port');
const PORT = portArg > -1 ? process.argv[portArg + 1] : process.env.DEMO_API_PORT || '3002';
const DEMO_DB = process.env.DEMO_DATABASE_URL || 'postgresql://test:test@127.0.0.1:15432/reserve_demo';

Object.assign(process.env, {
  NODE_ENV: 'development',
  PORT,
  DATABASE_URL: DEMO_DB,
  DIRECT_URL: DEMO_DB,
  REDIS_HOST: '127.0.0.1',
  REDIS_PORT: '16379',
  REDIS_PASSWORD: '',
  CORS_ORIGINS: 'http://localhost:3000,http://127.0.0.1:3000',
  // Sem token real: a sync do Meta so roda quando houver credencial de verdade.
  META_SYSTEM_USER_TOKEN: '',
});

if (!/127\.0\.0\.1|localhost/.test(process.env.DATABASE_URL)) {
  console.error('Recusado: DATABASE_URL nao e local.');
  process.exit(1);
}

const root = path.resolve(__dirname, '..', '..');
process.chdir(root);

if (!process.argv.includes('--no-build')) {
  const build = spawnSync('npx', ['nest', 'build'], { cwd: root, stdio: 'inherit', shell: true });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

require(path.join(root, 'dist', 'main.js'));
