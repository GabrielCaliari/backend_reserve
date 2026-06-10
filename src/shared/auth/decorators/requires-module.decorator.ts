import { SetMetadata } from '@nestjs/common';
import { GateableModule, isGateableModule } from '../constants/gateable-modules';

export const REQUIRES_MODULE_KEY = 'requires_module';

export function RequiresModule(module: GateableModule) {
  // Decorators run at class-load: a typo fails the boot, not a request.
  if (!isGateableModule(module)) {
    throw new Error(
      `@RequiresModule('${module}') is not a gateable module — see shared/auth/constants/gateable-modules.ts`,
    );
  }
  return SetMetadata(REQUIRES_MODULE_KEY, module);
}
