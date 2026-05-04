import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { PermissionsService } from './permissions.service';
import { PermissionOverridesService } from './permission-overrides.service';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [PermissionsService, PermissionOverridesService],
  exports: [PermissionsService, PermissionOverridesService],
})
export class RbacModule {}
