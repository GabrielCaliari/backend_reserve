import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { RequiresModule } from '../../../../shared/auth/decorators/requires-module.decorator';
import { CreateBlockDto } from '../../application/dtos/block.dto';
import { BlockService } from '../../application/services/block.service';

@Controller('motor/:tenantId/blocks')
@UseGuards(AdminJwtGuard, TenantGuard, ModuleAccessGuard, PermissionsGuard)
@RequiresModule('motor')
export class MotorBlockController {
  constructor(private readonly blockService: BlockService) {}

  @Get()
  @RequirePermissions('motor.read')
  async list(
    @Param('tenantId') tenantId: string,
    @Query('unit_id') unitId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.blockService.list(tenantId, { unit_id: unitId, from, to });
  }

  @Post()
  @RequirePermissions('motor.blocks.manage')
  async create(@Param('tenantId') tenantId: string, @Body() dto: CreateBlockDto, @Req() req: any) {
    return this.blockService.create(tenantId, dto, req.admin_id ?? 'admin');
  }

  @Delete(':id')
  @RequirePermissions('motor.blocks.manage')
  async remove(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.blockService.remove(tenantId, id);
  }
}
