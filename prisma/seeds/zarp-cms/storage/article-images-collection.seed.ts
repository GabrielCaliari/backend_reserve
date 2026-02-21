import 'dotenv/config';
import { PrismaClient } from '../../../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function seedArticleImagesCollection() {
  console.log('\n[ARTICLE IMAGES COLLECTION SEED]');

  // Get Zarp Studio tenant
  const zarpTenant = await prisma.tenant.findFirst({
    where: { slug: 'zarp-studio' },
  });

  if (!zarpTenant) {
    console.log('  ⚠ Zarp Studio tenant not found, skipping');
    return;
  }

  const collectionData = {
    name: 'Article Images',
    slug: 'article-images',
    description: 'Cover images and inline images for blog articles',
    type: 'image',
    max_file_size: 10485760, // 10MB
    allowed_mime_types: JSON.stringify(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    max_items: null,
    tenant_id: zarpTenant.id,
  };

  const existing = await prisma.mediaCollection.findUnique({
    where: {
      tenant_id_slug: {
        tenant_id: zarpTenant.id,
        slug: 'article-images',
      },
    },
  });

  if (existing) {
    await prisma.mediaCollection.update({
      where: { id: existing.id },
      data: collectionData,
    });
    console.log('  ↻ Collection updated: Article Images');
  } else {
    await prisma.mediaCollection.create({
      data: collectionData,
    });
    console.log('  ✓ Collection created: Article Images');
  }

  await prisma.$disconnect();
}
