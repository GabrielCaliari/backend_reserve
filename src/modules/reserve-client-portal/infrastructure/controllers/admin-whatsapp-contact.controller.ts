import { Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { BotRetentionService } from '../../application/services/bot-retention.service';

/**
 * §5.8 "exportação e exclusão... disponíveis ao admin" — mapped to
 * super_admin (the master doc's "admin" role has no exact match in
 * EAdminRole, same root cause as the funcionary-role ambiguity in the plan's
 * Global Constraints). hotel-portal.whatsapp-contacts.manage is deliberately
 * absent from every role grant array — only super_admin's PermissionsGuard
 * bypass reaches this route, matching admins.deactivate's existing
 * super_admin-only encoding.
 */
@Controller('admin/hotel-portal/:tenantId/whatsapp/contacts')
@UseGuards(AdminJwtGuard, PermissionsGuard)
@RequirePermissions('hotel-portal.whatsapp-contacts.manage')
export class AdminWhatsAppContactController {
  constructor(private readonly retentionService: BotRetentionService) {}

  @Post(':numeroContato/export')
  async exportContact(
    @Param('tenantId') tenantId: string,
    @Param('numeroContato') numeroContato: string,
  ) {
    return this.retentionService.exportContact(tenantId, numeroContato);
  }

  @Delete(':numeroContato')
  async eraseContact(
    @Param('tenantId') tenantId: string,
    @Param('numeroContato') numeroContato: string,
  ) {
    await this.retentionService.eraseContact(tenantId, numeroContato);
    return { erased: true };
  }
}
