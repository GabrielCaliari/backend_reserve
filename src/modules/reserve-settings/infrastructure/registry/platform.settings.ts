import {
  GATEABLE_MODULES,
  moduleFlagKey,
} from '../../../../shared/auth/constants/gateable-modules';
import { SettingDefinition } from '../../domain/entities/setting-definition';

/**
 * Module flags are ordinary settings under the `platform` module, scoped to
 * superadmin so a tenant admin can never re-enable a module for itself.
 * Default true: absence of a row means enabled.
 */
export const PLATFORM_SETTING_DEFINITIONS: SettingDefinition[] = GATEABLE_MODULES.map(
  (module) => ({
    module: 'platform',
    key: moduleFlagKey(module),
    type: 'boolean',
    default: true,
    scope: 'superadmin',
    description: `Enables the ${module} module for this tenant`,
  }),
);
