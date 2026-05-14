import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
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
    const certPath = path.join(
      process.cwd(),
      'public',
      'global-bundle.pem',
    );

    console.log('CERT PATH:', certPath);

    console.log('CERT EXISTS:', fs.existsSync(certPath));

    const caCert = fs.readFileSync(certPath, 'utf8');

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,

      ssl: {
        rejectUnauthorized: true,
        ca: caCert,
      },

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
    await this.$connect();

    console.log('✅ Database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}