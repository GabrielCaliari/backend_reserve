import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { Signer } from '@aws-sdk/rds-signer';

/** Retorna true quando DATABASE_URL aponta para Aurora RDS */
function isAuroraConnection(): boolean {
  const url = process.env.DATABASE_URL ?? '';
  return url.includes('rds.amazonaws.com') || url.includes('aurora');
}

/**
 * Cria o pg.Pool adequado ao ambiente:
 * - Aurora (prod/staging): IAM auth token rotativo via RDS Signer v3
 * - Outros (Prisma Postgres, local): conexao por string direta
 *
 * O token IAM expira em 15min. Ao passar `password` como funcao async,
 * o pool gera um token fresco a cada nova conexao, evitando falhas de auth.
 * Em producao (ECS/EC2), o SDK resolve credenciais via IAM Role automaticamente
 * sem precisar de AWS_ACCESS_KEY_ID no env.
 */
function buildPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL nao definida');
  }

  if (!isAuroraConnection()) {
    return new Pool({
      connectionString: databaseUrl,
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 20000,
      allowExitOnIdle: true,
    });
  }

  // Aurora com IAM Authentication
  const parsed = new URL(databaseUrl);

  const signer = new Signer({
    region: process.env.AWS_REGION ?? 'us-east-1',
    hostname: parsed.hostname,
    port: Number(parsed.port) || 5432,
    username: decodeURIComponent(parsed.username) || 'postgres',
  });

  return new Pool({
    host: parsed.hostname,
    port: Number(parsed.port) || 5432,
    database: parsed.pathname.replace(/^\//, ''),
    user: decodeURIComponent(parsed.username) || 'postgres',
    // Funcao async: chamada a cada nova conexao do pool — token sempre valido
    password: () => signer.getAuthToken(),
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000,
  });
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const pool = buildPool();
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: process.env.AMBIENT === 'DEV'
        ? ['error', 'info', 'query', 'warn']
        : ['error', 'warn'],
    });
  }

  async onModuleInit() {
    let retries = 3;
    while (retries > 0) {
      try {
        await this.$connect();
        console.log('Database connected successfully');
        break;
      } catch (error) {
        retries--;
        console.error(`Database connection failed. Retries left: ${retries}`);
        if (retries === 0) {
          console.error('Could not connect to database after 3 attempts');
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
