import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EAdminRole } from '../../domain/enums/admin-role.enum';
import { GetTenantCapabilitiesUseCase } from './get-tenant-capabilities.use-case';

describe('GetTenantCapabilitiesUseCase', () => {
  let prisma: { tenant: { findUnique: jest.Mock } };
  let adminRepository: { selectById: jest.Mock };
  let adminTenantRepository: { findRoleInTenant: jest.Mock };
  let permissionsService: { getPermissionsForRole: jest.Mock };
  let permissionOverridesService: { getForAdmin: jest.Mock };
  let useCase: GetTenantCapabilitiesUseCase;

  beforeEach(() => {
    prisma = { tenant: { findUnique: jest.fn().mockResolvedValue({ id: 'tenant-1', active: true }) } };
    adminRepository = {
      selectById: jest.fn().mockResolvedValue({ id: 'admin-1', role: EAdminRole.manager, active: true }),
    };
    adminTenantRepository = { findRoleInTenant: jest.fn().mockResolvedValue(EAdminRole.manager) };
    permissionsService = {
      getPermissionsForRole: jest.fn().mockResolvedValue(new Set(['leads.read', 'leads.update'])),
    };
    permissionOverridesService = {
      getForAdmin: jest.fn().mockResolvedValue({ grants: new Set(), denies: new Set() }),
    };
    useCase = new GetTenantCapabilitiesUseCase(
      prisma as any,
      adminRepository as any,
      adminTenantRepository as any,
      permissionsService as any,
      permissionOverridesService as any,
    );
  });

  it('throws NotFoundException when the tenant does not exist', async () => {
    prisma.tenant.findUnique.mockResolvedValue(null);
    await expect(useCase.execute('admin-1', 'tenant-1')).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when the tenant is inactive', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', active: false });
    await expect(useCase.execute('admin-1', 'tenant-1')).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when the admin is inactive or not found', async () => {
    adminRepository.selectById.mockResolvedValue(null);
    await expect(useCase.execute('admin-1', 'tenant-1')).rejects.toThrow(ForbiddenException);
  });

  it('super_admin gets the wildcard permission set without querying role grants', async () => {
    adminRepository.selectById.mockResolvedValue({ id: 'admin-1', role: EAdminRole.super_admin, active: true });
    const result = await useCase.execute('admin-1', 'tenant-1');
    expect(result).toEqual({ tenantId: 'tenant-1', role: EAdminRole.super_admin, permissions: ['*'] });
    expect(permissionsService.getPermissionsForRole).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when the admin has no role in the tenant', async () => {
    adminTenantRepository.findRoleInTenant.mockResolvedValue(null);
    await expect(useCase.execute('admin-1', 'tenant-1')).rejects.toThrow(ForbiddenException);
  });

  it('returns the sorted, override-applied permission set for a normal admin', async () => {
    permissionOverridesService.getForAdmin.mockResolvedValue({
      grants: new Set(['billing-config.manage']),
      denies: new Set(['leads.update']),
    });
    const result = await useCase.execute('admin-1', 'tenant-1');
    expect(result).toEqual({
      tenantId: 'tenant-1',
      role: EAdminRole.manager,
      permissions: ['billing-config.manage', 'leads.read'],
    });
  });

  it('normalizes company_admin to manager', async () => {
    adminTenantRepository.findRoleInTenant.mockResolvedValue(EAdminRole.company_admin);
    const result = await useCase.execute('admin-1', 'tenant-1');
    expect(result.role).toBe(EAdminRole.manager);
  });
});
