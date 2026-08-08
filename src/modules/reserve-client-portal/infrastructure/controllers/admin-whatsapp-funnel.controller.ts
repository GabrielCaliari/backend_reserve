import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { FunnelService } from '../../application/services/funnel.service';
import { FunnelStageChangeDto } from '../../application/dtos/funnel-stage-change.dto';

@Controller('admin/hotel-portal/:tenantId/whatsapp/funnel')
@UseGuards(AdminJwtGuard, PermissionsGuard)
@RequirePermissions('hotel-portal.whatsapp-funnel.manage')
export class AdminWhatsAppFunnelController {
  constructor(private readonly funnelService: FunnelService) {}

  @Patch(':contactId/stage')
  async moveStage(
    @Param('tenantId') tenantId: string,
    @Param('contactId') contactId: string,
    @Body() dto: FunnelStageChangeDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ) {
    return this.funnelService.moveStage(
      tenantId,
      contactId,
      dto.para_estagio,
      admin.admin_id,
      dto.motivo,
      dto.tipo_publico,
    );
  }
}
