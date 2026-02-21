// @ts-nocheck
/**
 * Seed: Author Avatars MediaCollection
 * 
 * Creates the MediaCollection for author profile images.
 * Requirement: 11.2
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedAuthorAvatarsCollection() {
  console.log('Seeding author-avatars MediaCollection...');

  try {
    // Check if collection already exists
    const existing = await prisma.mediaCollection.findFirst({
      where: { slug: 'author-avatars' },
    });

    if (existing) {
      console.log('✓ author-avatars collection already exists');
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
        slug: 'author-avatars',
        name: 'Author Avatars',
        description: 'Profile images for article authors',
        type: 'image',
        allowed_mime_types: [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
        ],
        max_file_size: 5242880, // 5MB (smaller than article images)
        tenant_id: firstTenant.id,
        created_by: firstAdmin.id,
      },
    });

    console.log(`✓ Created author-avatars collection (ID: ${collection.id})`);
    return collection;
  } catch (error) {
    console.error('Failed to seed author-avatars collection:', error);
    throw error;
  }
}

// Run seed if executed directly
if (require.main === module) {
  seedAuthorAvatarsCollection()
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
