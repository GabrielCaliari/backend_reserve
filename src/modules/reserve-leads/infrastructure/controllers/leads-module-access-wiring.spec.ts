import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { REQUIRES_MODULE_KEY } from '../../../../shared/auth/decorators/requires-module.decorator';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { AdminAppointmentController } from './admin-appointment.controller';
import { AdminAppointmentScheduleConfigController } from './admin-appointment-schedule-config.controller';
import { AdminBlockedPeriodController } from './admin-blocked-period.controller';
import { LeadCollectionController } from './lead-collection.controller';
import { LeadController } from './lead.controller';

const CLASS_GATED_CONTROLLERS = [
  AdminAppointmentController,
  AdminAppointmentScheduleConfigController,
  AdminBlockedPeriodController,
  LeadCollectionController,
];

describe('reserve-leads: ModuleAccessGuard wiring (class-level)', () => {
  it.each(CLASS_GATED_CONTROLLERS)('%p carries @RequiresModule(leads) at class level', (Controller) => {
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, Controller)).toBe('leads');
  });

  it.each(CLASS_GATED_CONTROLLERS)('%p runs ModuleAccessGuard in its class-level guard chain', (Controller) => {
    const guards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, Controller) ?? [];
    expect(guards).toContain(ModuleAccessGuard);
  });
});

describe('reserve-leads: LeadController (mixed public/admin, gated per-method)', () => {
  const ADMIN_METHODS = [
    'findLeads',
    'findLeadById',
    'getLeadAttachments',
    'addAttachment',
    'removeAttachment',
    'updateLead',
    'updateLeadStatus',
    'deleteLead',
  ];

  it.each(ADMIN_METHODS)('%s carries @RequiresModule(leads) and ModuleAccessGuard', (method) => {
    const handler = LeadController.prototype[method as keyof typeof LeadController.prototype];
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, handler)).toBe('leads');
    const guards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, handler) ?? [];
    expect(guards).toContain(ModuleAccessGuard);
  });

  it('leaves the public lead-capture handler (createLead) ungated', () => {
    const handler = LeadController.prototype.createLead;
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, handler)).toBeUndefined();
    const guards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, handler) ?? [];
    expect(guards).not.toContain(ModuleAccessGuard);
  });
});
