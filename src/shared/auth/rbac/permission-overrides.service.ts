import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AdminOverrides } from './apply-overrides';

/**
 * Lê AdminPermissionOverride sempre fresco (2026-07-26: um cache com TTL por
 * instância deixaria uma escrita em uma instância servir grants/denies
 * obsoletos em outra — inaceitável para uma decisão de autorização).
 * `effect` é a string literal 'grant' ou 'deny' (ver Global Constraints
 * sobre EPermissionEffect não ser o tipo real da coluna).
 */
@Injectable()
export class PermissionOverridesService {
  constructor(private readonly prisma: PrismaService) {}

  async getForAdmin(adminId: string, tenantId: string): Promise<AdminOverrides> {
    const rows = await this.prisma.adminPermissionOverride.findMany({
      where: { admin_id: adminId, tenant_id: tenantId },
      select: { effect: true, Permission: { select: { name: true } } },
    });
    const grants = new Set<string>();
    const denies = new Set<string>();
    for (const row of rows) (row.effect === 'deny' ? denies : grants).add(row.Permission.name);
    return { grants, denies };
  }
}
