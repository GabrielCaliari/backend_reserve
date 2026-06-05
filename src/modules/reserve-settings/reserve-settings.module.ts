import { Module } from '@nestjs/common';
import { ReserveAuthModule } from '../reserve-auth/reserve-auth.module';
import { SettingsService } from './application/services/settings.service';
import { ModuleFlagsService } from './application/services/module-flags.service';
import { TenantDomainsService } from './application/services/tenant-domains.service';
import { SettingsRegistry } from './infrastructure/registry/settings-registry';
import { TenantModulesController } from './infrastructure/controllers/tenant-modules.controller';
import { SuperadminModulesController } from './infrastructure/controllers/superadmin-modules.controller';
import { TenantDomainsController } from './infrastructure/controllers/tenant-domains.controller';
import { SuperadminSettingsController } from './infrastructure/controllers/superadmin-settings.controller';
import { TenantSettingsController } from './infrastructure/controllers/tenant-settings.controller';
import { PrismaTenantSettingRepository } from './infrastructure/repositories/prisma-tenant-setting.repository';
import { TENANT_SETTING_REPOSITORY } from './domain/interfaces/tenant-setting.repository.interface';

@Module({
  imports: [ReserveAuthModule],
  // Route order matters: /modules, /tenants/:tenantId/modules and
  // /tenants/:tenantId/domains must match before the /:module and
  // /tenants/:tenantId/:module catch-alls.
  controllers: [
    TenantModulesController,
    SuperadminModulesController,
    TenantDomainsController,
    SuperadminSettingsController,
    TenantSettingsController,
  ],
  providers: [
    SettingsService,
    ModuleFlagsService,
    TenantDomainsService,
    SettingsRegistry,
    { provide: TENANT_SETTING_REPOSITORY, useClass: PrismaTenantSettingRepository },
  ],
  exports: [SettingsService, SettingsRegistry],
})
export class ReserveSettingsModule {}
