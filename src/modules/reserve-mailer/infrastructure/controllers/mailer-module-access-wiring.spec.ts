import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { REQUIRES_MODULE_KEY } from '../../../../shared/auth/decorators/requires-module.decorator';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { EmailCampaignController } from './email-campaign.controller';
import { LeadController } from './lead.controller';
import { ConfigController } from './config.controller';
import { EventNotificationController } from './event-notification.controller';

const GATED_CONTROLLERS = [EmailCampaignController, LeadController];

describe('reserve-mailer: ModuleAccessGuard wiring', () => {
  it.each(GATED_CONTROLLERS)('%p carries @RequiresModule(mailer) at class level', (Controller) => {
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, Controller)).toBe('mailer');
  });

  it.each(GATED_CONTROLLERS)('%p runs ModuleAccessGuard in its class-level guard chain', (Controller) => {
    const guards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, Controller) ?? [];
    expect(guards).toContain(ModuleAccessGuard);
  });

  // ConfigController and EventNotificationController are deliberately left
  // ungated: neither runs TenantGuard (no request.tenant_id is ever set), so
  // they are platform-wide admin config, not tenant-scoped routes — wiring
  // ModuleAccessGuard onto them would throw ModuleAccessGuard's own
  // "must run after TenantGuard" misconfiguration error on every request
  // from a non-super_admin. See module-access-wiring session report.
  it('ConfigController stays ungated (no TenantGuard, not tenant-scoped)', () => {
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, ConfigController)).toBeUndefined();
  });

  it('EventNotificationController stays ungated (no TenantGuard, not tenant-scoped)', () => {
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, EventNotificationController)).toBeUndefined();
  });
});
