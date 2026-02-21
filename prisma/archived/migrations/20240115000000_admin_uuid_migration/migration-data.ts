// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

/**
 * Admin UUID Data Migration
 * 
 * This script generates UUIDs for all existing Admin records and updates
 * all foreign key references in related tables.
 * 
 * Run this script AFTER running the schema migration SQL but BEFORE
 * dropping the old columns.
 */

const prisma = new PrismaClient();

interface AdminMapping {
  oldId: number;
  newId: string;
}

async function migrateAdminUUIDs() {
  console.log('Starting Admin UUID migration...');

  try {
    // Step 1: Get all existing Admin records
    const admins = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT id FROM "Admin" ORDER BY id
    `;

    console.log(`Found ${admins.length} Admin records to migrate`);

    // Step 2: Generate UUID mappings
    const adminMappings: AdminMapping[] = admins.map((admin) => ({
      oldId: admin.id,
      newId: createId(), // Generate 12-character cuid
    }));

    console.log('Generated UUID mappings for all Admin records');

    // Step 3: Update Admin.id_uuid
    for (const mapping of adminMappings) {
      await prisma.$executeRaw`
        UPDATE "Admin" 
        SET id_uuid = ${mapping.newId}
        WHERE id = ${mapping.oldId}
      `;
    }

    console.log('Updated Admin.id_uuid for all records');

    // Step 4: Update Article.created_by_uuid
    for (const mapping of adminMappings) {
      await prisma.$executeRaw`
        UPDATE "Article" 
        SET created_by_uuid = ${mapping.newId}
        WHERE created_by = ${mapping.oldId}
      `;
    }

    console.log('Updated Article.created_by_uuid references');

    // Step 5: Update Article.last_edited_by_uuid
    for (const mapping of adminMappings) {
      await prisma.$executeRaw`
        UPDATE "Article" 
        SET last_edited_by_uuid = ${mapping.newId}
        WHERE last_edited_by = ${mapping.oldId}
      `;
    }

    console.log('Updated Article.last_edited_by_uuid references');

    // Step 6: Update AdminTenant.admin_id_uuid
    for (const mapping of adminMappings) {
      await prisma.$executeRaw`
        UPDATE "AdminTenant" 
        SET admin_id_uuid = ${mapping.newId}
        WHERE admin_id = ${mapping.oldId}
      `;
    }

    console.log('Updated AdminTenant.admin_id_uuid references');

    // Step 7: Update AdminSessionToken.admin_id_uuid
    for (const mapping of adminMappings) {
      await prisma.$executeRaw`
        UPDATE "AdminSessionToken" 
        SET admin_id_uuid = ${mapping.newId}
        WHERE admin_id = ${mapping.oldId}
      `;
    }

    console.log('Updated AdminSessionToken.admin_id_uuid references');

    // Step 8: Update AdminCredential.admin_id_uuid
    for (const mapping of adminMappings) {
      await prisma.$executeRaw`
        UPDATE "AdminCredential" 
        SET admin_id_uuid = ${mapping.newId}
        WHERE admin_id = ${mapping.oldId}
      `;
    }

    console.log('Updated AdminCredential.admin_id_uuid references');

    // Step 9: Verify all mappings
    const unmappedAdmins = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count FROM "Admin" WHERE id_uuid IS NULL
    `;

    if (unmappedAdmins[0].count > 0) {
      throw new Error(`Found ${unmappedAdmins[0].count} Admin records without UUID mapping`);
    }

    console.log('✓ All Admin records successfully mapped to UUIDs');
    console.log('✓ All foreign key references updated');
    console.log('\nMigration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run the rest of the migration SQL to drop old columns and rename UUID columns');
    console.log('2. Generate Prisma client: npx prisma generate');
    console.log('3. Update application code to use string IDs for Admin');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateAdminUUIDs()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
