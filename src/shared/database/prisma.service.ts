import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Configure pg Pool with better connection handling
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10, // Maximum number of connections in the pool
      idleTimeoutMillis: 30000, // Close idle connections after 30s
      connectionTimeoutMillis: 10000, // Wait 10s for connection
      allowExitOnIdle: false,
    });

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
        console.log('✅ Database connected successfully');
        break;
      } catch (error) {
        retries--;
        console.error(`❌ Database connection failed. Retries left: ${retries}`);
        if (retries === 0) {
          console.error('❌ Could not connect to database after 3 attempts');
          throw error;
        }
        // Wait 2 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
