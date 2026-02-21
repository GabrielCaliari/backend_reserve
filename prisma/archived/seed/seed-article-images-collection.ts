/**
 * Seed: Article Images MediaCollection
 * 
 * Creates the MediaCollection for article-related images.
 * Requirement: 11.1
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedArticleImagesCollection() {
  console.log('Seeding article-images MediaCollection...');

  try {
    // Check if collection already exists
    const existing = await prisma.mediaCollection.findFirst({
      where: { slug: 'article-images' },
    });

    if (existing) {
      console.log('✓ article-images collection already exists');
      return existing;
    }

    // Get the first admin user to use as creator
    const firstAdmin = await prisma.admin.findFirst({
      where: { active: true },
      orderBy: { id: 'asc' },
    });

    if (!firstAdmin) {
      throw new Error('No active admin found. Please create an admin user first.');
    }

    // Get the first tenant
    const firstTenant = await prisma.tenant.findFirst({
      orderBy: { id: 'asc' },
    });

    if (!firstTenant) {
      throw new Error('No tenant found. Please create a tenant first.');
    }

    // Create the collection
    const collection = await prisma.mediaCollection.create({
      data: {
        slug: 'article-images',
        name: 'Article Images',
        description: 'Images used in article content and cover images',
        type: 'image',
        allowed_mime_types: [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
        ],
        max_file_size: 10485760, // 10MB
        tenant_id: firstTenant.id,
        created_by: firstAdmin.id,
      },
    });

    console.log(`✓ Created article-images collection (ID: ${collection.id})`);
    return collection;
  } catch (error) {
    console.error('Failed to seed article-images collection:', error);
    throw error;
  }
}

// Run seed if executed directly
if (require.main === module) {
  seedArticleImagesCollection()
    .then(() => {
      console.log('Seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
