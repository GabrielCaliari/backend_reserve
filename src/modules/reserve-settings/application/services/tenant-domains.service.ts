import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { CorsOriginService } from '../../../../shared/cors/cors-origin.service';
import { CreateTenantDomainDto, UpdateTenantDomainDto } from '../dtos/tenant-domain.dto';

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';
}

function assertCompilableRegex(value: string): void {
  try {
    new RegExp(value);
  } catch {
    throw new BadRequestException(`"${value}" is not a valid regular expression`);
  }
}

/**
 * Every write here changes the CORS allowlist that CorsOriginService caches —
 * invalidate() MUST run after create/update/remove (see shared/cors constraint).
 */
@Injectable()
export class TenantDomainsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly corsOriginService: CorsOriginService,
  ) {}

  async list(tenantId: string) {
    await this.assertTenantExists(tenantId);
    return this.prisma.tenantDomain.findMany({
      where: { tenant_id: tenantId },
      orderBy: [{ is_primary: 'desc' }, { created_at: 'asc' }],
    });
  }

  async create(tenantId: string, dto: CreateTenantDomainDto) {
    await this.assertTenantExists(tenantId);
    const type = dto.type ?? 'domain';
    if (type === 'regex') assertCompilableRegex(dto.value);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        if (dto.is_primary) {
          await tx.tenantDomain.updateMany({ where: { tenant_id: tenantId }, data: { is_primary: false } });
        }
        return tx.tenantDomain.create({
          data: {
            tenant_id: tenantId,
            type,
            value: dto.value,
            is_primary: dto.is_primary ?? false,
          },
        });
      });
      this.corsOriginService.invalidate();
      return created;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(`Domain "${dto.value}" is already registered`);
      }
      throw error;
    }
  }

  async update(tenantId: string, domainId: string, dto: UpdateTenantDomainDto) {
    await this.assertDomainBelongsToTenant(tenantId, domainId);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.is_primary) {
        await tx.tenantDomain.updateMany({ where: { tenant_id: tenantId }, data: { is_primary: false } });
      }
      return tx.tenantDomain.update({ where: { id: domainId }, data: dto });
    });
    this.corsOriginService.invalidate();
    return updated;
  }

  async remove(tenantId: string, domainId: string): Promise<void> {
    await this.assertDomainBelongsToTenant(tenantId, domainId);
    await this.prisma.tenantDomain.delete({ where: { id: domainId } });
    this.corsOriginService.invalidate();
  }

  private async assertTenantExists(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
    if (!tenant) throw new NotFoundException('Tenant not found');
  }

  private async assertDomainBelongsToTenant(tenantId: string, domainId: string): Promise<void> {
    const domain = await this.prisma.tenantDomain.findUnique({
      where: { id: domainId },
      select: { tenant_id: true },
    });
    if (!domain || domain.tenant_id !== tenantId) throw new NotFoundException('Tenant domain not found');
  }
}
