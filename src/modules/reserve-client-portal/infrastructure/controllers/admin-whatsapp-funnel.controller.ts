import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { RequiresModule } from '../../../../shared/auth/decorators/requires-module.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { FunnelService } from '../../application/services/funnel.service';
import { FunnelStageChangeDto } from '../../application/dtos/funnel-stage-change.dto';
import { ResumeConversationDto } from '../../application/dtos/resume-conversation.dto';
import { ExtendHoldDto, PauseConversationDto } from '../../application/dtos/funnel-action.dto';

@Controller('admin/hotel-portal/:tenantId/whatsapp/funnel')
// O tenant vem do proprio caminho (`:tenantId`), entao o TenantGuard o resolve
// sem depender de header, valida que o admin pertence a ele e publica
// request.tenant_id - pre-requisito do ModuleAccessGuard.
@UseGuards(AdminJwtGuard, TenantGuard, ModuleAccessGuard, PermissionsGuard)
@RequiresModule('client-portal')
@RequirePermissions('hotel-portal.whatsapp-funnel.manage')
export class AdminWhatsAppFunnelController {
  constructor(private readonly funnelService: FunnelService) {}

  /**
   * Retomada humana: despausa o bot para o contato e (opcionalmente) devolve o
   * lead a um estagio. Mesma permissao do mover-estagio: editor+.
   */
  @Post(':contactId/resume')
  async resumeConversation(
    @Param('tenantId') tenantId: string,
    @Param('contactId') contactId: string,
    @Body() dto: ResumeConversationDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ) {
    return this.funnelService.resumeConversation(tenantId, contactId, admin.admin_id, dto.estagio);
  }

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

  /** "Assumir conversa": pausa o bot para o contato (contrato v2 §5.1, pause_bot). */
  @Post(':contactId/pause')
  async pauseConversation(
    @Param('tenantId') tenantId: string,
    @Param('contactId') contactId: string,
    @Body() dto: PauseConversationDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ) {
    return this.funnelService.pauseConversation(tenantId, contactId, admin.admin_id, dto.motivo);
  }

  /** Estende o prazo do hold que esta aguardando pagamento (extend_hold). */
  @Post(':contactId/extend-hold')
  async extendHold(
    @Param('tenantId') tenantId: string,
    @Param('contactId') contactId: string,
    @Body() dto: ExtendHoldDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ) {
    return this.funnelService.extendHold(tenantId, contactId, admin.admin_id, dto.minutos, dto.codigo);
  }
}
