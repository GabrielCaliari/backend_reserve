import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    console.log(
  'CERT EXISTS:',
  fs.existsSync(
    path.join(process.cwd(), 'certs', 'global-bundle.pem'),
  ),
);
    // Caminho do certificado SSL
    const caCert = fs.readFileSync(
      path.join(process.cwd(), "certs", "global-bundle.pem"),
      "utf8",
    );

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,

      // SSL CONFIG
      ssl: {
        rejectUnauthorized: true,
        ca: caCert,
      },

      // SERVERLESS OPTIMIZATION
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 20000,
      allowExitOnIdle: true,
    });

    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log:
        process.env.AMBIENT === 'DEV'
          ? ['error', 'info', 'query', 'warn']
          : ['error', 'warn'],
    });
  }

  async onModuleInit() {
    let retries = 3;

    while (retries > 0) {
      try {
        await this.$connect();
        console.log('✅ Database connected successfully');
        break;
      } catch (error) {
        retries--;

        console.error(
          `❌ Database connection failed. Retries left: ${retries}`,
        );

        if (retries === 0) {
          console.error(
            '❌ Could not connect to database after 3 attempts',
          );

          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
