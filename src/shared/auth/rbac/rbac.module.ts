import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { PermissionsService } from './permissions.service';
import { PermissionOverridesService } from './permission-overrides.service';
import { TenantPermissionPolicyService } from './tenant-permission-policy.service';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [PermissionsService, PermissionOverridesService, TenantPermissionPolicyService],
  exports: [PermissionsService, PermissionOverridesService, TenantPermissionPolicyService],
})
export class RbacModule {}
