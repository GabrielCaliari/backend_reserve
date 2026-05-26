import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Auth module seeds
import { seedTenants } from './seeds/reserve-auth/tenants.seed';
import { seedAdmins } from './seeds/reserve-auth/admins.seed';

// Shared seeds
import { seedPlans } from './seeds/shared/plans.seed';
import { seedTokenPacks } from './seeds/shared/token-packs.seed';

// CMS module seeds
import { seedAuthors } from './seeds/reserve-cms/authors.seed';
import { seedBlogs } from './seeds/reserve-cms/blogs.seed';
import { seedAuthorAvatarsCollection } from './seeds/reserve-cms/storage/author-avatars-collection.seed';
import { seedArticleImagesCollection } from './seeds/reserve-cms/storage/article-images-collection.seed';
import { seedCvUploadsCollection } from './seeds/reserve-cms/storage/cv-uploads-collection.seed';
import { seedArticles } from './seeds/reserve-cms/articles.seed';

// Leads module seeds
import { seedLeadCollections } from './seeds/reserve-leads/collections.seed';
import { seedLeads } from './seeds/reserve-leads/leads.seed';

// Mailer module seeds
import { seedSMTPServers } from './seeds/reserve-mailer/smtp-servers.seed';

// CNPJs module seeds
import { seedCNAEs } from './seeds/reserve-cnpjs/cnaes.seed';

/**
 * Main seed orchestrator
 *
 * Execution order follows dependency hierarchy:
 * 1. Auth: Tenants → Admins (foundation)
 * 2. Shared: Plans, Token Packs
 * 3. CNPJs: CNAEs (lookup data)
 * 4. CMS: Authors → Blogs → Storage Collections → Articles
 * 5. Leads: Collections → Leads
 * 6. Mailer: SMTP Servers
 */
(async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          DATABASE SEEDING - Gabriel Caliari API               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // ========================================
    // 1. AUTH MODULE (Foundation)
    // ========================================
    console.log('\n┌─────────────────────────────────────┐');
    console.log('│  MÓDULO: reserve-AUTH                  │');
    console.log('└─────────────────────────────────────┘');
    
    await seedTenants();
    await seedAdmins();

    // ========================================
    // 2. SHARED DATA
    // ========================================
    console.log('\n┌─────────────────────────────────────┐');
    console.log('│  MÓDULO: SHARED                     │');
    console.log('└─────────────────────────────────────┘');
    
    await seedPlans();
    await seedTokenPacks();

    // ========================================
    // 3. CNPJS MODULE (lookup data)
    // ========================================
    console.log('\n┌─────────────────────────────────────┐');
    console.log('│  MÓDULO: reserve-CNPJS                 │');
    console.log('└─────────────────────────────────────┘');

    await seedCNAEs();

    // ========================================
    // 4. CMS MODULE
    // ========================================
    console.log('\n┌─────────────────────────────────────┐');
    console.log('│  MÓDULO: reserve-CMS                   │');
    console.log('└─────────────────────────────────────┘');

    await seedAuthors();
    await seedBlogs();
    await seedAuthorAvatarsCollection();
    await seedArticleImagesCollection();
    await seedCvUploadsCollection();
    await seedArticles();

    // ========================================
    // 5. LEADS MODULE
    // ========================================
    console.log('\n┌─────────────────────────────────────┐');
    console.log('│  MÓDULO: reserve-LEADS                 │');
    console.log('└─────────────────────────────────────┘');

    await seedLeadCollections();
    await seedLeads();

    // ========================================
    // 6. MAILER MODULE
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
