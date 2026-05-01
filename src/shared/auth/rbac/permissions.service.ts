import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EAdminRole } from '../../../modules/reserve-auth/domain/enums/admin-role.enum';
import { normalizeAdminRole } from './permission-matrix';

const PERMISSIONS_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Resolve o conjunto de permissões de um papel com cache em processo (Map no
 * singleton do Nest, sem Redis — TTL de 5 min). Todo escritor de
 * RolePermission (seed, futura UI de gestão) deve chamar invalidate(); o TTL
 * só cobre uma invalidação esquecida.
 */
@Injectable()
export class PermissionsService {
  private cache = new Map<EAdminRole, { permissions: ReadonlySet<string>; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async getPermissionsForRole(role: EAdminRole): Promise<ReadonlySet<string>> {
    const normalized = normalizeAdminRole(role);
    const hit = this.cache.get(normalized);
    if (hit && Date.now() < hit.expiresAt) return hit.permissions;

    const rows = await this.prisma.rolePermission.findMany({
      where: { role: normalized },
      select: { Permission: { select: { name: true } } },
    });
    const permissions: ReadonlySet<string> = new Set(rows.map((row) => row.Permission.name));
    this.cache.set(normalized, { permissions, expiresAt: Date.now() + PERMISSIONS_CACHE_TTL_MS });
    return permissions;
  }

  /** Chamar depois de qualquer escrita em Permission/RolePermission. */
  invalidate(): void {
    this.cache.clear();
  }
}
