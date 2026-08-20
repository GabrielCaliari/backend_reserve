import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Shared seeds
import { seedPlans } from './seeds/shared/plans.seed';
import { seedPermissions } from './seeds/shared/permissions.seed';

// Mailer module seeds
import { seedSMTPServers } from './seeds/reserve-mailer/smtp-servers.seed';

/**
 * Main seed orchestrator
 *
 * Apenas dados de infraestrutura (idempotentes):
 * 1. Shared: Permissions (catálogo RBAC), Plans
 * 2. Mailer: SMTP Servers
 *
 * Tenants e admins não são seedados — use scripts/create-super-admin.ts
 * para criar o primeiro admin em um banco novo.
 */
(async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          DATABASE SEEDING - Gabriel Caliari API               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // ========================================
    // 1. SHARED DATA
    // ========================================
    console.log('\n┌─────────────────────────────────────┐');
    console.log('│  MÓDULO: SHARED                     │');
    console.log('└─────────────────────────────────────┘');

    await seedPermissions();
    await seedPlans();

    // ========================================
    // 2. MAILER MODULE
    // ========================================
    console.log('\n┌─────────────────────────────────────┐');
    console.log('│  MÓDULO: reserve-MAILER                │');
    console.log('└─────────────────────────────────────┘');

    await seedSMTPServers();

    // ========================================
    // COMPLETION
    // ========================================
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              ✓ SEEDING CONCLUÍDO COM SUCESSO              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n╔════════════════════════════════════════════════════════════╗');
    console.error('║                  ✗ ERRO NO SEEDING                        ║');
    console.error('╚════════════════════════════════════════════════════════════╝\n');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
