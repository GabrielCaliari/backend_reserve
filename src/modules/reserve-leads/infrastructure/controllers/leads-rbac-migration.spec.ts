import 'reflect-metadata';
import { REQUIRE_PERMISSIONS_KEY } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { AdminAppointmentController } from './admin-appointment.controller';
import { AdminAppointmentScheduleConfigController } from './admin-appointment-schedule-config.controller';
import { AdminBlockedPeriodController } from './admin-blocked-period.controller';
import { LeadController } from './lead.controller';
import { LeadCollectionController } from './lead-collection.controller';

function permissionsOf(target: any, method: string): string[] | undefined {
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target.prototype[method]);
}

describe('reserve-leads RBAC migration', () => {
  it('AdminAppointmentController', () => {
    expect(permissionsOf(AdminAppointmentController, 'list')).toEqual(['appointments.read']);
    expect(permissionsOf(AdminAppointmentController, 'getOne')).toEqual(['appointments.read']);
    expect(permissionsOf(AdminAppointmentController, 'cancel')).toEqual(['appointments.update']);
    expect(permissionsOf(AdminAppointmentController, 'complete')).toEqual(['appointments.update']);
  });

  it('AdminAppointmentScheduleConfigController', () => {
    expect(permissionsOf(AdminAppointmentScheduleConfigController, 'upsert')).toEqual([
      'appointments.schedule-config.manage',
    ]);
    expect(permissionsOf(AdminAppointmentScheduleConfigController, 'get')).toEqual([
      'appointments.schedule-config.read',
    ]);
  });

  it('AdminBlockedPeriodController', () => {
    expect(permissionsOf(AdminBlockedPeriodController, 'list')).toEqual(['appointments.blocked-period.read']);
    expect(permissionsOf(AdminBlockedPeriodController, 'create')).toEqual(['appointments.blocked-period.create']);
    expect(permissionsOf(AdminBlockedPeriodController, 'update')).toEqual(['appointments.blocked-period.update']);
    expect(permissionsOf(AdminBlockedPeriodController, 'delete')).toEqual(['appointments.blocked-period.delete']);
  });

  it('LeadController (admin routes)', () => {
    expect(permissionsOf(LeadController, 'findLeads')).toEqual(['leads.read']);
    expect(permissionsOf(LeadController, 'findLeadById')).toEqual(['leads.read']);
    expect(permissionsOf(LeadController, 'getLeadAttachments')).toEqual(['leads.read']);
    expect(permissionsOf(LeadController, 'addAttachment')).toEqual(['leads.attachment.create']);
    expect(permissionsOf(LeadController, 'removeAttachment')).toEqual(['leads.attachment.delete']);
    expect(permissionsOf(LeadController, 'updateLead')).toEqual(['leads.update']);
    expect(permissionsOf(LeadController, 'updateLeadStatus')).toEqual(['leads.update']);
    expect(permissionsOf(LeadController, 'deleteLead')).toEqual(['leads.delete']);
  });

  it('LeadCollectionController', () => {
    expect(permissionsOf(LeadCollectionController, 'create')).toEqual(['leads.collection.create']);
    expect(permissionsOf(LeadCollectionController, 'findAll')).toEqual(['leads.collection.read']);
    expect(permissionsOf(LeadCollectionController, 'getAllTenantLeads')).toEqual(['leads.read']);
    expect(permissionsOf(LeadCollectionController, 'findOne')).toEqual(['leads.collection.read']);
    expect(permissionsOf(LeadCollectionController, 'update')).toEqual(['leads.collection.update']);
    expect(permissionsOf(LeadCollectionController, 'regenerateSecretKey')).toEqual(['leads.collection.manage-key']);
    expect(permissionsOf(LeadCollectionController, 'remove')).toEqual(['leads.collection.delete']);
    expect(permissionsOf(LeadCollectionController, 'getCollectionLeads')).toEqual(['leads.read']);
  });
});
