import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { AdminController } from './admin.controller';
import { AdminUserController } from './admin-user.controller';
import { TenantController } from './tenant.controller';
import { PostController } from './admin-post.controller';
import { REQUIRE_PERMISSIONS_KEY } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';

const reflector = new Reflector();

function permissionsOf(target: any, method: string): string[] | undefined {
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target.prototype[method]);
}

// PostController aplica @RequirePermissions na CLASSE (não por método) — o
// metadado fica em `target`, não em `target.prototype[method]`.
function permissionsOfClass(target: any): string[] | undefined {
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target);
}

function guardsOf(target: any, method?: string): unknown[] {
  const metaTarget = method ? target.prototype[method] : target;
  return Reflect.getMetadata(GUARDS_METADATA, metaTarget) ?? [];
}

describe('reserve-auth RBAC migration', () => {
  // Método real: register
  it('AdminController.register requires admins.create via PermissionsGuard', () => {
    expect(permissionsOf(AdminController, 'register')).toEqual(['admins.create']);
    expect(guardsOf(AdminController, 'register')).toContain(PermissionsGuard);
  });

  it('AdminController.listAll requires admins.read', () => {
    expect(permissionsOf(AdminController, 'listAll')).toEqual(['admins.read']);
  });

  it('AdminController.updateRole requires admins.role.update', () => {
    expect(permissionsOf(AdminController, 'updateRole')).toEqual(['admins.role.update']);
  });

  it('AdminController.deactivate requires admins.deactivate (zero-grant)', () => {
    expect(permissionsOf(AdminController, 'deactivate')).toEqual(['admins.deactivate']);
  });

  it('AdminController.activate requires admins.activate (zero-grant)', () => {
    expect(permissionsOf(AdminController, 'activate')).toEqual(['admins.activate']);
  });

  // Método real: findById (não getById)
  it('AdminController.findById requires admins.read', () => {
    expect(permissionsOf(AdminController, 'findById')).toEqual(['admins.read']);
  });

  it('AdminController.update requires admins.update', () => {
    expect(permissionsOf(AdminController, 'update')).toEqual(['admins.update']);
  });

  // Método real: scheduleDeletion (DELETE /:id, não "remove")
  it('AdminController.scheduleDeletion requires admins.delete (zero-grant)', () => {
    expect(permissionsOf(AdminController, 'scheduleDeletion')).toEqual(['admins.delete']);
  });

  it('AdminController.restoreDeletion requires admins.delete (reused, consistent: also super_admin-only today)', () => {
    expect(permissionsOf(AdminController, 'restoreDeletion')).toEqual(['admins.delete']);
  });

  // Método real: getDeletionStatus (não "deletionStatus")
  it('AdminController.getDeletionStatus requires the dedicated admins.deletion-status.read (anomaly preserved)', () => {
    expect(permissionsOf(AdminController, 'getDeletionStatus')).toEqual(['admins.deletion-status.read']);
  });

  // Métodos reais: findAll (não "list"), findById
  it('AdminUserController findAll/findById require users.read', () => {
    expect(permissionsOf(AdminUserController, 'findAll')).toEqual(['users.read']);
    expect(permissionsOf(AdminUserController, 'findById')).toEqual(['users.read']);
  });

  // Método real: delete (não "remove")
  it('AdminUserController update/deactivate/delete require zero-grant permissions', () => {
    expect(permissionsOf(AdminUserController, 'update')).toEqual(['users.update']);
    expect(permissionsOf(AdminUserController, 'deactivate')).toEqual(['users.deactivate']);
    expect(permissionsOf(AdminUserController, 'delete')).toEqual(['users.delete']);
  });

  // Métodos reais: create, findAll (não "list"), findById (não "getById"), update
  it('TenantController create/findAll/findById/update require the matching zero-grant tenants.* permission', () => {
    expect(permissionsOf(TenantController, 'create')).toEqual(['tenants.create']);
    expect(permissionsOf(TenantController, 'findAll')).toEqual(['tenants.read']);
    expect(permissionsOf(TenantController, 'findById')).toEqual(['tenants.read']);
    expect(permissionsOf(TenantController, 'update')).toEqual(['tenants.update']);
  });

  // Métodos reais: assignAdmin, unassignAdmin, findAdminsByTenant
  it('TenantController assignAdmin/unassignAdmin/findAdminsByTenant/updateAdminRole require the matching tenants.admin.* permission', () => {
    expect(permissionsOf(TenantController, 'assignAdmin')).toEqual(['tenants.admin.assign']);
    expect(permissionsOf(TenantController, 'unassignAdmin')).toEqual(['tenants.admin.remove']);
    expect(permissionsOf(TenantController, 'findAdminsByTenant')).toEqual(['tenants.admin.read']);
    expect(permissionsOf(TenantController, 'updateAdminRole')).toEqual(['tenants.admin.role.update']);
  });

  // Método real: delete (DELETE /:id, não "remove")
  it('TenantController deactivate/activate/delete/restore require the matching zero-grant permission', () => {
    expect(permissionsOf(TenantController, 'deactivate')).toEqual(['tenants.deactivate']);
    expect(permissionsOf(TenantController, 'activate')).toEqual(['tenants.activate']);
    expect(permissionsOf(TenantController, 'delete')).toEqual(['tenants.delete']);
    expect(permissionsOf(TenantController, 'restore')).toEqual(['tenants.delete']);
  });

  // @RequirePermissions está na classe (não no método generateFXImage,
  // que é o único handler do controller).
  it('PostController requires post.image-generation.manage at the class level', () => {
    expect(permissionsOfClass(PostController)).toEqual(['post.image-generation.manage']);
    expect(guardsOf(PostController)).toContain(PermissionsGuard);
  });
});
