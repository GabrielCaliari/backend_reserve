import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { RequiresModule } from '../../../../shared/auth/decorators/requires-module.decorator';
import { CreateRoomTypeDto, UpdateRoomTypeDto } from '../../application/dtos/room-type.dto';
import { RoomTypeService } from '../../application/services/room-type.service';

@Controller('motor/:tenantId/room-types')
// O tenant vem do proprio caminho (`:tenantId`): o TenantGuard o resolve,
// valida que o admin pertence a ele e publica request.tenant_id —
// pre-requisito do ModuleAccessGuard.
@UseGuards(AdminJwtGuard, TenantGuard, ModuleAccessGuard, PermissionsGuard)
@RequiresModule('motor')
export class MotorRoomTypeController {
  constructor(private readonly roomTypeService: RoomTypeService) {}

  @Get()
  @RequirePermissions('motor.read')
  async list(@Param('tenantId') tenantId: string) {
    return this.roomTypeService.list(tenantId);
  }

  @Post()
  @RequirePermissions('motor.settings.manage')
  async create(@Param('tenantId') tenantId: string, @Body() dto: CreateRoomTypeDto) {
    return this.roomTypeService.create(tenantId, dto);
  }

  @Put(':id')
  @RequirePermissions('motor.settings.manage')
  async update(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRoomTypeDto,
  ) {
    return this.roomTypeService.update(tenantId, id, dto);
  }
}
