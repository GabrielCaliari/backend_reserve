import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EAdminRole } from '../../../modules/reserve-auth/domain/enums/admin-role.enum';
import { PermissionsGuard } from './permissions.guard';

function makeContext(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

describe('PermissionsGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let adminRepository: { selectById: jest.Mock };
  let adminTenantRepository: { findRoleInTenant: jest.Mock };
  let permissionsService: { getPermissionsForRole: jest.Mock };
  let permissionOverridesService: { getForAdmin: jest.Mock };
  let guard: PermissionsGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(['leads.delete']) };
    adminRepository = {
      selectById: jest.fn().mockResolvedValue({ id: 'admin-1', role: EAdminRole.manager, active: true }),
    };
    adminTenantRepository = { findRoleInTenant: jest.fn().mockResolvedValue(EAdminRole.manager) };
    permissionsService = {
      getPermissionsForRole: jest.fn().mockResolvedValue(new Set(['leads.delete'])),
    };
    permissionOverridesService = {
      getForAdmin: jest.fn().mockResolvedValue({ grants: new Set(), denies: new Set() }),
    };
    guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      adminRepository as any,
      adminTenantRepository as any,
      permissionsService as any,
      permissionOverridesService as any,
    );
  });

  it('passes when no permissions are required on the route', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    await expect(guard.canActivate(makeContext({ admin_id: 'admin-1' }))).resolves.toBe(true);
  });

  it('passes OPTIONS preflight without checks', async () => {
    await expect(guard.canActivate(makeContext({ method: 'OPTIONS' }))).resolves.toBe(true);
  });

  it('denies when admin identity is missing (AdminJwtGuard did not run)', async () => {
    await expect(guard.canActivate(makeContext({}))).rejects.toThrow(ForbiddenException);
  });

  it('denies an inactive admin', async () => {
    adminRepository.selectById.mockResolvedValue({ id: 'admin-1', role: EAdminRole.manager, active: false });
    await expect(guard.canActivate(makeContext({ admin_id: 'admin-1' }))).rejects.toThrow(ForbiddenException);
  });

  it('super_admin bypasses the permission check', async () => {
    adminRepository.selectById.mockResolvedValue({ id: 'admin-1', role: EAdminRole.super_admin, active: true });
    permissionsService.getPermissionsForRole.mockResolvedValue(new Set());
    await expect(guard.canActivate(makeContext({ admin_id: 'admin-1' }))).resolves.toBe(true);
    expect(permissionsService.getPermissionsForRole).not.toHaveBeenCalled();
  });

  it('uses the per-tenant role when request.tenant_id is present', async () => {
    adminTenantRepository.findRoleInTenant.mockResolvedValue(EAdminRole.viewer);
    permissionsService.getPermissionsForRole.mockResolvedValue(new Set(['leads.read']));
    await expect(
      guard.canActivate(makeContext({ admin_id: 'admin-1', tenant_id: 'tenant-1' })),
    ).rejects.toThrow(ForbiddenException);
    expect(permissionsService.getPermissionsForRole).toHaveBeenCalledWith(EAdminRole.viewer);
  });

  it('denies when the admin has no role in the tenant', async () => {
    adminTenantRepository.findRoleInTenant.mockResolvedValue(null);
    await expect(
      guard.canActivate(makeContext({ admin_id: 'admin-1', tenant_id: 'tenant-1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('falls back to the global role without tenant_id', async () => {
    await expect(guard.canActivate(makeContext({ admin_id: 'admin-1' }))).resolves.toBe(true);
    expect(permissionsService.getPermissionsForRole).toHaveBeenCalledWith(EAdminRole.manager);
    expect(adminTenantRepository.findRoleInTenant).not.toHaveBeenCalled();
  });

  it('requires ALL listed permissions', async () => {
    reflector.getAllAndOverride.mockReturnValue(['leads.delete', 'leads.update']);
    permissionsService.getPermissionsForRole.mockResolvedValue(new Set(['leads.delete']));
    await expect(guard.canActivate(makeContext({ admin_id: 'admin-1' }))).rejects.toThrow(ForbiddenException);
  });

  it('grant override allows a permission the role lacks', async () => {
    reflector.getAllAndOverride.mockReturnValue(['billing-config.manage']);
    permissionsService.getPermissionsForRole.mockResolvedValue(new Set());
    permissionOverridesService.getForAdmin.mockResolvedValue({
      grants: new Set(['billing-config.manage']),
      denies: new Set(),
    });
    await expect(
      guard.canActivate(makeContext({ admin_id: 'admin-1', tenant_id: 'tenant-1' })),
    ).resolves.toBe(true);
  });

  it('deny override blocks a permission the role holds', async () => {
    reflector.getAllAndOverride.mockReturnValue(['leads.delete']);
    permissionOverridesService.getForAdmin.mockResolvedValue({
      grants: new Set(),
      denies: new Set(['leads.delete']),
    });
    await expect(
      guard.canActivate(makeContext({ admin_id: 'admin-1', tenant_id: 'tenant-1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('overrides are skipped when no tenant is resolved', async () => {
    await expect(guard.canActivate(makeContext({ admin_id: 'admin-1' }))).resolves.toBe(true);
    expect(permissionOverridesService.getForAdmin).not.toHaveBeenCalled();
  });
});
