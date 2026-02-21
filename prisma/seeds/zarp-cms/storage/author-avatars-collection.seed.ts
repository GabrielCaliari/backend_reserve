import 'dotenv/config';
import { PrismaClient } from '../../../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function seedAuthorAvatarsCollection() {
  console.log('\n[AUTHOR AVATARS COLLECTION SEED]');

  // Get Zarp Studio tenant
  const zarpTenant = await prisma.tenant.findFirst({
    where: { slug: 'zarp-studio' },
  });

  if (!zarpTenant) {
    console.log('  ⚠ Zarp Studio tenant not found, skipping');
    return;
  }

  const collectionData = {
    name: 'Author Avatars',
    slug: 'author-avatars',
    description: 'Profile pictures for blog authors',
    type: 'image',
    max_file_size: 5242880, // 5MB
    allowed_mime_types: JSON.stringify(['image/jpeg', 'image/png', 'image/webp']),
    max_items: null,
    tenant_id: zarpTenant.id,
  };

  const existing = await prisma.mediaCollection.findUnique({
    where: {
      tenant_id_slug: {
        tenant_id: zarpTenant.id,
        slug: 'author-avatars',
      },
    },
  });

  if (existing) {
    await prisma.mediaCollection.update({
      where: { id: existing.id },
      data: collectionData,
    });
    console.log('  ↻ Collection updated: Author Avatars');
  } else {
    await prisma.mediaCollection.create({
      data: collectionData,
    });
    console.log('  ✓ Collection created: Author Avatars');
  }

  await prisma.$disconnect();
}
