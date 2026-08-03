import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { REQUIRES_MODULE_KEY } from '../../../../shared/auth/decorators/requires-module.decorator';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { TenantBillingConfigController } from './tenant-billing-config.controller';
import { SubscriptionsController } from './subscriptions.controller';
import { StripePlansController } from './stripe-plans.controller';

describe('reserve-subscriptions (payments): ModuleAccessGuard wiring', () => {
  it('TenantBillingConfigController carries @RequiresModule(payments) at class level', () => {
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, TenantBillingConfigController)).toBe('payments');
  });

  it('TenantBillingConfigController runs ModuleAccessGuard in its class-level guard chain', () => {
    const guards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, TenantBillingConfigController) ?? [];
    expect(guards).toContain(ModuleAccessGuard);
  });

  // SubscriptionsController and StripePlansController's admin routes are
  // deliberately left ungated: neither runs TenantGuard today (tenant id is
  // read ad hoc from a header/query param straight into the handler, never
  // through request.tenant_id), so ModuleAccessGuard cannot run on them
  // without first adding TenantGuard — a separate, larger authorization
  // change out of scope for this wiring pass. See session report.
  it('SubscriptionsController stays ungated (no TenantGuard)', () => {
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, SubscriptionsController)).toBeUndefined();
  });

  it('StripePlansController stays ungated (no TenantGuard)', () => {
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, StripePlansController)).toBeUndefined();
  });
});
