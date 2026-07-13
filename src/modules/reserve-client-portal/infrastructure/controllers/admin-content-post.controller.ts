import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { ContentPostService } from '../../application/services/content-post.service';
import { CreateContentPostDto, UpdateContentPostDto } from '../../application/dtos/content-post.dto';

@Controller('admin/hotel-portal/:tenantId/content-posts')
@UseGuards(AdminJwtGuard, PermissionsGuard)
@RequirePermissions('hotel-portal.content.manage')
export class AdminContentPostController {
  constructor(private readonly contentPostService: ContentPostService) {}

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateContentPostDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ) {
    return this.contentPostService.create(tenantId, dto, admin.id);
  }

  @Get()
  async list(@Param('tenantId') tenantId: string) {
    return this.contentPostService.list(tenantId);
  }

  @Get(':id')
  async findById(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.contentPostService.findById(tenantId, id);
  }

  @Patch(':id')
  async update(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateContentPostDto,
  ) {
    return this.contentPostService.update(tenantId, id, dto);
  }

  @Patch(':id/publish')
  async publish(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.contentPostService.publish(tenantId, id);
  }

  @Delete(':id')
  async delete(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.contentPostService.delete(tenantId, id);
  }
}
