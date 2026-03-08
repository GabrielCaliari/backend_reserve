import 'dotenv/config';
import { PrismaClient, EAdminRole } from '../../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as crypto from 'crypto';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/** Standalone PBKDF2 hash for seed scripts (mirrors HashProvider) */
function hashPassword(value: string): { salt: string; hash: string } {
  const pk = process.env.ENCRYPT_PRIVATE_KEY;
  if (!pk) throw new Error('ENCRYPT_PRIVATE_KEY env var not set');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(value, salt + pk, 856, 64, 'sha512').toString('hex');
  return { salt, hash };
}

interface AdminSeed {
  name: string;
  email: string;
  password: string;
  role: EAdminRole;
  active: boolean;
}

interface AdminTenantAssignment {
  adminEmail: string;
  tenantSlug: string;
  role: EAdminRole;
}

export async function seedAdmins() {
  const admins: AdminSeed[] = [
    {
      name: 'Diego Kelme',
      email: 'kelme.dev@pm.me',
      password: 'Vamos@Inovar@26',
      role: EAdminRole.super_admin,
      active: true,
    },
    {
      name: 'Cauã Cunha',
      email: 'caua@zarpstudio.com',
      password: 'Zarp@Unicorn@26',
      role: EAdminRole.super_admin,
      active: true,
    },
    {
      name: 'Emily Clamerick',
      email: 'info@zarpstudio.com',
      password: 'Zarp@Emily@20',
      role: EAdminRole.super_admin,
      active: true,
    },
    {
      name: 'Gabriel Caliari',
      email: 'tech@zarpstudio.com',
      password: 'Zarp@Caliari@26',
      role: EAdminRole.super_admin,
      active: true,
    },
    {
      name: 'Rael Schwelm Lara',
      email: 'allbrickpaving@gmail.com',
      password: 'Rael@Pavers@26',
      role: EAdminRole.company_admin,
      active: true,
    },
    {
      name: 'Cruz Vinci',
      email: 'floridaexamprep@gmail.com',
      password: 'Florida@Exam@26@Cruz',
      role: EAdminRole.company_admin,
      active: true,
    },
    {
      name: 'Miguel',
      email: 'levelonegrading@gmail.com',
      password: 'Level@One@26@Live',
      role: EAdminRole.company_admin,
      active: true,
    },
  ];

  /** Admin-tenant assignments with tenant-specific roles */
  const adminTenantAssignments: AdminTenantAssignment[] = [
    // Super admins do not need explicit tenant assignments.

    // Rael Schwelm Lara - owner of All Brick Pavers
    { adminEmail: 'allbrickpaving@gmail.com', tenantSlug: 'allbrickpavers', role: EAdminRole.owner },

    // Cruz Vinci - owner of Florida Exam Prep
    { adminEmail: 'floridaexamprep@gmail.com', tenantSlug: 'florida-exam-prep', role: EAdminRole.owner },

    // Miguel - owner of Level One Grading
    { adminEmail: 'levelonegrading@gmail.com', tenantSlug: 'level-one-grading', role: EAdminRole.owner },
  ];

  async function deleteOldAdmins(adminsList: AdminSeed[]) {
    try {
      const allAdmins = await prisma.admin.findMany();
      const allowedEmails = adminsList.map((a) => a.email);
      const adminsToDelete = allAdmins.filter((admin) => !allowedEmails.includes(admin.email));

      let deleted = 0;

      for (const admin of adminsToDelete) {
        await prisma.$transaction(async (tx) => {
          await tx.adminTenant.deleteMany({ where: { admin_id: admin.id } });
          await tx.adminSessionToken.deleteMany({ where: { admin_id: admin.id } });
          await tx.adminCredential.deleteMany({ where: { admin_id: admin.id } });
          await tx.admin.delete({ where: { id: admin.id } });
        });

        deleted++;
        console.log(`  ✗ Admin deleted: ${admin.email}`);
      }

      return deleted;
    } catch (error) {
      console.log(`  ⚠ Could not delete old admins (database may have incompatible data types)`);
      console.log(`  ℹ Continuing with upsert operations...`);
      return 0;
    }
  }

  async function upsertAdmins(adminsList: AdminSeed[]) {
    let inserted = 0;
    let updated = 0;

    for (const admin of adminsList) {
      const adminExists = await prisma.admin.findUnique({
        where: { email: admin.email },
      });

      if (adminExists) {
        await prisma.$transaction(async (tx) => {
          await tx.admin.update({
            where: { id: adminExists.id },
            data: {
              name: admin.name,
              email: admin.email,
              role: admin.role,
              active: admin.active,
            },
          });

          const { hash, salt } = hashPassword(admin.password);

          await tx.adminCredential.upsert({
            where: { admin_id: adminExists.id },
            update: { hash, salt },
            create: { hash, salt, admin_id: adminExists.id },
          });
        });

        updated++;
        console.log(`  ↻ Admin updated: ${admin.email} (${admin.role})`);
      } else {
        await prisma.$transaction(async (tx) => {
          const _admin = await tx.admin.create({
            data: {
              name: admin.name,
              email: admin.email,
              role: admin.role,
              active: admin.active,
            },
          });

          const { hash, salt } = hashPassword(admin.password);

          await tx.adminCredential.create({
            data: { hash, salt, admin_id: _admin.id },
          });
        });

        inserted++;
        console.log(`  ✓ Admin created: ${admin.email} (${admin.role})`);
      }
    }

    return { inserted, updated };
  }

  async function seedAdminTenantAssignments(assignments: AdminTenantAssignment[]) {
    let created = 0;
    let updated = 0;

    for (const assignment of assignments) {
      const admin = await prisma.admin.findUnique({ where: { email: assignment.adminEmail } });
      const tenant = await prisma.tenant.findUnique({ where: { slug: assignment.tenantSlug } });

      if (!admin || !tenant) {
        console.log(
          `  ⚠ SKIP: Admin "${assignment.adminEmail}" or Tenant "${assignment.tenantSlug}" not found`,
        );
        continue;
      }

      const existing = await prisma.adminTenant.findUnique({
        where: { admin_id_tenant_id: { admin_id: admin.id, tenant_id: tenant.id } },
      });

      if (existing) {
        await prisma.adminTenant.update({
          where: { id: existing.id },
          data: { role: assignment.role, active: true },
        });
        updated++;
        console.log(`  ↻ Assignment updated: ${admin.email} → ${tenant.slug} (${assignment.role})`);
      } else {
        await prisma.adminTenant.create({
          data: {
            admin_id: admin.id,
            tenant_id: tenant.id,
            role: assignment.role,
            active: true,
          },
        });
        created++;
        console.log(`  ✓ Assignment created: ${admin.email} → ${tenant.slug} (${assignment.role})`);
      }
    }

    return { created, updated };
  }

  console.log('\n[ADMINS SEED]');
  const deleted = await deleteOldAdmins(admins);
  const result = await upsertAdmins(admins);
  const assignmentResult = await seedAdminTenantAssignments(adminTenantAssignments);

  console.log(`\n  Summary: ${deleted} deleted, ${result.inserted} created, ${result.updated} updated`);
  console.log(`  Assignments: ${assignmentResult.created} created, ${assignmentResult.updated} updated\n`);

  await prisma.$disconnect();
}
