/**
 * Sobe a API apontando para o banco local de demonstracao, nunca para a Neon.
 *
 * O .env do repositorio aponta para PRODUCAO e os crons escrevem ao subir, entao
 * este launcher fixa DATABASE_URL/REDIS antes do Nest ler o .env (o ConfigModule
 * nao sobrescreve variavel ja definida no processo).
 *
 * Pre-requisito: containers reserve-test-pg (15432) e reserve-test-redis (16379)
 * de pe, com o banco reserve_demo migrado. Ver scripts/demo/README.md.
 *
 * Uso: node scripts/demo/start-local.cjs [--port 3002]
 */
const { spawn, spawnSync } = require('child_process');
const path = require('path');

const portArg = process.argv.indexOf('--port');
const PORT = portArg > -1 ? process.argv[portArg + 1] : process.env.DEMO_API_PORT || '3002';
const DEMO_DB = process.env.DEMO_DATABASE_URL || 'postgresql://test:test@127.0.0.1:15432/reserve_demo';

const env = {
  ...process.env,
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
};

if (!/127\.0\.0\.1|localhost/.test(env.DATABASE_URL)) {
  console.error('Recusado: DATABASE_URL nao e local.');
  process.exit(1);
}

const root = path.resolve(__dirname, '..', '..');
const child = spawn('npx', ['nest', 'start'], { cwd: root, env, stdio: 'inherit', shell: true });
child.on('exit', (code) => process.exit(code ?? 0));

// Com shell: true o servidor roda num neto; sem derrubar a arvore, parar o
// launcher deixa a porta presa por um processo orfao (visto no Windows).
const stop = () => {
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F']);
  else child.kill('SIGTERM');
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
