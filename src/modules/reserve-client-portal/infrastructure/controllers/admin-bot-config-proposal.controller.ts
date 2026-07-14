import { Body, Controller, Get, Param, Patch, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { BotConfigProposalService } from '../../application/services/bot-config-proposal.service';
import { RejectBotConfigProposalDto } from '../../application/dtos/bot-config-proposal.dto';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';

@Controller('admin/hotel-portal/:tenantId/bot-config-proposals')
@UseGuards(AdminJwtGuard, PermissionsGuard)
@RequirePermissions('hotel-portal.bot-config-proposals.manage')
export class AdminBotConfigProposalController {
  constructor(private readonly botConfigProposalService: BotConfigProposalService) {}

  @Get()
  async findByTenantId(
    @Param('tenantId') tenantId: string,
    @Query('status') status: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.botConfigProposalService.findByTenantId(tenantId, status);
    return res.status(result.status).json(result.data);
  }

  @Patch(':id/approve')
  async approve(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Res() res: Response,
  ) {
    const result = await this.botConfigProposalService.approve(tenantId, id, admin.admin_id);
    return res.status(result.status).json(result.data);
  }

  @Patch(':id/reject')
  async reject(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: RejectBotConfigProposalDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Res() res: Response,
  ) {
    const result = await this.botConfigProposalService.reject(tenantId, id, admin.admin_id, dto);
    return res.status(result.status).json(result.data);
  }
}
