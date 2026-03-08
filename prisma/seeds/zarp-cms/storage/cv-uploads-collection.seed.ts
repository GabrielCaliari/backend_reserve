import 'dotenv/config';
import { PrismaClient } from '../../../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function seedCvUploadsCollection() {
  console.log('\n[CV UPLOADS COLLECTION SEED]');

  const zarpTenant = await prisma.tenant.findFirst({
    where: { slug: 'zarp-studio' },
  });

  if (!zarpTenant) {
    console.log('  ⚠ Zarp Studio tenant not found, skipping');
    return;
  }

  const collectionData = {
    name: 'CV Uploads - Careers',
    slug: 'cv-uploads-zarp-studio',
    description:
      'Resumes and portfolios submitted by candidates through the Zarp Studio careers page',
    type: 'document',
    max_file_size: 10485760, // 10MB
    allowed_mime_types: JSON.stringify([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]),
    max_items: null,
    tenant_id: zarpTenant.id,
  };

  const existing = await prisma.mediaCollection.findUnique({
    where: {
      tenant_id_slug: {
        tenant_id: zarpTenant.id,
        slug: 'cv-uploads-zarp-studio',
      },
    },
  });

  if (existing) {
    await prisma.mediaCollection.update({
      where: { id: existing.id },
      data: collectionData,
    });
    console.log('  ↻ Collection updated: CV Uploads - Careers');
  } else {
    await prisma.mediaCollection.create({
      data: collectionData,
    });
    console.log('  ✓ Collection created: CV Uploads - Careers');
  }

  await prisma.$disconnect();
}
