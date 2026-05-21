import 'dotenv/config';
import { PrismaClient, EAdminRole } from '../../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PERMISSIONS, ROLE_GRANTS } from '../../../src/shared/auth/rbac/permission-matrix';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Seed idempotente do RBAC (docs/superpowers/plans/2026-07-26-fase2-backend-rbac.md):
 * upserta toda permissão declarada e todo grant de papel do matrix. Nunca
 * remove linha — uma permissão retirada do matrix precisa de limpeza manual
 * e deliberada, não automática pelo seed.
 */
export async function seedPermissions() {
  for (const name of PERMISSIONS) {
    await prisma.permission.upsert({ where: { name }, update: {}, create: { name } });
  }

  for (const [role, grants] of Object.entries(ROLE_GRANTS) as [EAdminRole, readonly string[]][]) {
    for (const name of grants) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { name } });
      await prisma.rolePermission.upsert({
        where: { role_permission_id: { role, permission_id: permission.id } },
        update: {},
        create: { role, permission_id: permission.id },
      });
    }
  }

  console.log(
    `Seeded ${PERMISSIONS.length} permissions and role grants for ${Object.keys(ROLE_GRANTS).length} roles.`,
  );
}

if (require.main === module) {
  seedPermissions()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
