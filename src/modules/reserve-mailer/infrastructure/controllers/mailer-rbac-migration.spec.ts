import 'reflect-metadata';
import { REQUIRE_PERMISSIONS_KEY } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { ConfigController } from './config.controller';
import { EmailCampaignController } from './email-campaign.controller';
import { EventNotificationController } from './event-notification.controller';
import { LeadController } from './lead.controller';

function permissionsOf(target: any, method: string): string[] | undefined {
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target.prototype[method]);
}

// EmailCampaignController aplica @RequirePermissions na CLASSE (uma única
// permissão para as 8 rotas) — o metadado fica em `target`, não em
// `target.prototype[method]` (mesmo padrão de PostController na Task 9).
function permissionsOfClass(target: any): string[] | undefined {
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target);
}

describe('reserve-mailer RBAC migration', () => {
  it('ConfigController — smtp-config zero-grant (super_admin only, preserved)', () => {
    expect(permissionsOf(ConfigController, 'createSmtpServer')).toEqual(['mailer.smtp-config.manage']);
    expect(permissionsOf(ConfigController, 'findSmtpServers')).toEqual(['mailer.smtp-config.read']);
  });

  it('EmailCampaignController — mailer.campaign.manage on the class (all 8 routes today)', () => {
    expect(permissionsOfClass(EmailCampaignController)).toEqual(['mailer.campaign.manage']);
  });

  it('EventNotificationController', () => {
    expect(permissionsOf(EventNotificationController, 'createSMSNotification')).toEqual(['mailer.sms.create']);
    expect(permissionsOf(EventNotificationController, 'findSMSNotification')).toEqual(['mailer.sms.read']);
    expect(permissionsOf(EventNotificationController, 'createSMSNotificationEvent')).toEqual(['mailer.sms.send']);
    expect(permissionsOf(EventNotificationController, 'findByIdNotificationSMSNotificationEvent')).toEqual([
      'mailer.sms.read',
    ]);
    expect(permissionsOf(EventNotificationController, 'findByIdSMSNotification')).toEqual(['mailer.sms.read']);
  });

  it('LeadController (mailer)', () => {
    expect(permissionsOf(LeadController, 'findLead')).toEqual(['mailer.lead.read']);
    expect(permissionsOf(LeadController, 'createLead')).toEqual(['mailer.lead.create']);
  });
});
