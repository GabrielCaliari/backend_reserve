import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { RequiresModule } from '../../../../shared/auth/decorators/requires-module.decorator';
import { BotIssueService } from '../../application/services/bot-issue.service';
import { BotIssueItemDto, UpdateBotIssueStatusDto } from '../../application/dtos/bot-issue.dto';

/**
 * Triagem da tela "Erros do bot": a equipe marca o erro como visto/corrigido.
 * Mesma cadeia e permissao das acoes do funil (o tenant vem do caminho).
 */
@Controller('admin/hotel-portal/:tenantId/bot-issues')
@UseGuards(AdminJwtGuard, TenantGuard, ModuleAccessGuard, PermissionsGuard)
@RequiresModule('client-portal')
@RequirePermissions('hotel-portal.whatsapp-funnel.manage')
export class AdminBotIssuesController {
  constructor(private readonly botIssueService: BotIssueService) {}

  @ApiOkResponse({ type: BotIssueItemDto, description: 'Item atualizado. 404 se o erro nao for deste tenant.' })
  @Patch(':id/status')
  async updateStatus(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBotIssueStatusDto,
  ) {
    return this.botIssueService.updateStatus(tenantId, id, dto.status);
  }
}
