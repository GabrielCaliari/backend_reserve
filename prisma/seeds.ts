import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Auth module seeds
import { seedTenants } from './seeds/zarp-auth/tenants.seed';
import { seedAdmins } from './seeds/zarp-auth/admins.seed';

// Shared seeds
import { seedPlans } from './seeds/shared/plans.seed';
import { seedTokenPacks } from './seeds/shared/token-packs.seed';

// CMS module seeds
import { seedAuthors } from './seeds/zarp-cms/authors.seed';
import { seedBlogs } from './seeds/zarp-cms/blogs.seed';
import { seedAuthorAvatarsCollection } from './seeds/zarp-cms/storage/author-avatars-collection.seed';
import { seedArticleImagesCollection } from './seeds/zarp-cms/storage/article-images-collection.seed';
import { seedCvUploadsCollection } from './seeds/zarp-cms/storage/cv-uploads-collection.seed';
import { seedArticles } from './seeds/zarp-cms/articles.seed';

// Leads module seeds
import { seedLeadCollections } from './seeds/zarp-leads/collections.seed';
import { seedLeads } from './seeds/zarp-leads/leads.seed';

// Mailer module seeds
import { seedSMTPServers } from './seeds/zarp-mailer/smtp-servers.seed';

// CNPJs module seeds
import { seedCNAEs } from './seeds/zarp-cnpjs/cnaes.seed';

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
  console.log('║          DATABASE SEEDING - ZARP STUDIO API               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // ========================================
    // 1. AUTH MODULE (Foundation)
    // ========================================
    console.log('\n┌─────────────────────────────────────┐');
    console.log('│  MÓDULO: ZARP-AUTH                  │');
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
    console.log('│  MÓDULO: ZARP-CNPJS                 │');
    console.log('└─────────────────────────────────────┘');

    await seedCNAEs();

    // ========================================
    // 4. CMS MODULE
    // ========================================
    console.log('\n┌─────────────────────────────────────┐');
    console.log('│  MÓDULO: ZARP-CMS                   │');
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
    console.log('│  MÓDULO: ZARP-LEADS                 │');
    console.log('└─────────────────────────────────────┘');

    await seedLeadCollections();
    await seedLeads();

    // ========================================
    // 6. MAILER MODULE
    // ========================================
    console.log('\n┌─────────────────────────────────────┐');
    console.log('│  MÓDULO: ZARP-MAILER                │');
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
