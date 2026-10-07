import 'reflect-metadata';
import { REQUIRE_PERMISSIONS_KEY } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { AdminHotelClientController } from './admin-hotel-client.controller';
import { AdminHotelMetricsController } from './admin-hotel-metrics.controller';
import { AdminReservationsController } from './admin-reservations.controller';
import { GuestCrmController } from './guest-crm.controller';
import { ReportController } from './report.controller';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppTrackingController } from './whatsapp-tracking.controller';

function classPermissionsOf(target: any): string[] | undefined {
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target);
}

function methodPermissionsOf(target: any, method: string): string[] | undefined {
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target.prototype[method]);
}

describe('reserve-client-portal RBAC migration', () => {
  it('AdminHotelClientController — class requires hotel-portal.clients.manage, deactivate is narrower (anomaly preserved)', () => {
    expect(classPermissionsOf(AdminHotelClientController)).toEqual(['hotel-portal.clients.manage']);
    expect(methodPermissionsOf(AdminHotelClientController, 'deactivate')).toEqual([
      'hotel-portal.clients.deactivate',
    ]);
  });

  it('AdminHotelClientController — segredo do Canal C exige hotel-portal.bot-integration.manage (como Canal A/B)', () => {
    expect(methodPermissionsOf(AdminHotelClientController, 'regenerateWebhookSecret')).toEqual([
      'hotel-portal.bot-integration.manage',
    ]);
  });

  it('AdminHotelMetricsController — class requires hotel-portal.metrics.manage, no method override', () => {
    expect(classPermissionsOf(AdminHotelMetricsController)).toEqual(['hotel-portal.metrics.manage']);
  });

  it('AdminReservationsController — class requires hotel-portal.reservations.manage', () => {
    expect(classPermissionsOf(AdminReservationsController)).toEqual(['hotel-portal.reservations.manage']);
  });

  it('GuestCrmController — class requires hotel-portal.guests.manage', () => {
    expect(classPermissionsOf(GuestCrmController)).toEqual(['hotel-portal.guests.manage']);
  });

  it('ReportController — class requires hotel-portal.reports.manage, publish is narrower (anomaly preserved)', () => {
    expect(classPermissionsOf(ReportController)).toEqual(['hotel-portal.reports.manage']);
    expect(methodPermissionsOf(ReportController, 'publish')).toEqual(['hotel-portal.reports.publish']);
  });

  it('WhatsAppController — class requires hotel-portal.whatsapp.manage', () => {
    expect(classPermissionsOf(WhatsAppController)).toEqual(['hotel-portal.whatsapp.manage']);
  });

  it('WhatsAppTrackingController — class requires hotel-portal.whatsapp-links.manage', () => {
    expect(classPermissionsOf(WhatsAppTrackingController)).toEqual(['hotel-portal.whatsapp-links.manage']);
  });
});
