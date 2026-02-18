import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TenantService } from '../../application/services/tenant.service';
import { CreateTenantDTO, UpdateTenantDTO, AssignAdminToTenantDTO } from '../../application/dtos/tenant-management.dto';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { EAdminRole } from '../../domain/enums/admin-role.enum';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';

@ApiTags('Tenant Management')
@ApiBearerAuth()
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post('/')
  @Roles(EAdminRole.super_admin)
  @UseGuards(AdminJwtGuard, RolesGuard)
  @ApiOperation({ summary: 'Create a new tenant (super_admin only)' })
  @ApiResponse({ status: 201, description: 'Tenant created' })
  @ApiResponse({ status: 400, description: 'Slug already exists' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async create(@Body() dto: CreateTenantDTO, @Res() res: Response) {
    const result = await this.tenantService.create(dto);
    return res.status(result.status).json(result.data);
  }

  @Get('/')
  @Roles(EAdminRole.super_admin)
  @UseGuards(AdminJwtGuard, RolesGuard)
  @ApiOperation({ summary: 'List all tenants (super_admin only)' })
  @ApiResponse({ status: 200, description: 'Tenants listed' })
  async findAll(@Res() res: Response) {
    const result = await this.tenantService.findAll();
    return res.status(result.status).json(result.data);
  }

  @Get('/my-tenants')
  @UseGuards(AdminJwtGuard)
  @ApiOperation({ summary: 'List tenants the authenticated admin belongs to' })
  @ApiResponse({ status: 200, description: 'Admin tenants listed' })
  async findMyTenants(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Res() res: Response,
  ) {
    const result = await this.tenantService.findTenantsByAdmin(admin.admin_id);
    return res.status(result.status).json(result.data);
  }

  @Get('/:id')
  @Roles(EAdminRole.super_admin)
  @UseGuards(AdminJwtGuard, RolesGuard)
  @ApiOperation({ summary: 'Get tenant by ID (super_admin only)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Tenant found' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async findById(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const result = await this.tenantService.findById(id);
    return res.status(result.status).json(result.data);
  }

  @Patch('/:id')
  @Roles(EAdminRole.super_admin)
  @UseGuards(AdminJwtGuard, RolesGuard)
  @ApiOperation({ summary: 'Update tenant (super_admin only)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Tenant updated' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTenantDTO,
    @Res() res: Response,
  ) {
    const result = await this.tenantService.update(id, dto);
    return res.status(result.status).json(result.data);
  }

  @Post('/assign')
  @Roles(EAdminRole.super_admin)
  @UseGuards(AdminJwtGuard, RolesGuard)
  @ApiOperation({ summary: 'Assign admin to tenant (super_admin only)' })
  @ApiResponse({ status: 201, description: 'Admin assigned to tenant' })
  @ApiResponse({ status: 404, description: 'Admin or tenant not found' })
  async assignAdmin(@Body() dto: AssignAdminToTenantDTO, @Res() res: Response) {
    const result = await this.tenantService.assignAdmin(dto.admin_id, dto.tenant_id);
    return res.status(result.status).json(result.data);
  }

  @Delete('/:tenantId/admins/:adminId')
  @Roles(EAdminRole.super_admin)
  @UseGuards(AdminJwtGuard, RolesGuard)
  @ApiOperation({ summary: 'Remove admin from tenant (super_admin only)' })
  @ApiParam({ name: 'tenantId', type: Number })
  @ApiParam({ name: 'adminId', type: Number })
  @ApiResponse({ status: 200, description: 'Admin removed from tenant' })
  async unassignAdmin(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('adminId', ParseIntPipe) adminId: number,
    @Res() res: Response,
  ) {
    const result = await this.tenantService.unassignAdmin(adminId, tenantId);
    return res.status(result.status).json(result.data);
  }

  @Get('/:tenantId/admins')
  @Roles(EAdminRole.super_admin)
  @UseGuards(AdminJwtGuard, RolesGuard)
  @ApiOperation({ summary: 'List admins of a tenant (super_admin only)' })
  @ApiParam({ name: 'tenantId', type: Number })
  @ApiResponse({ status: 200, description: 'Tenant admins listed' })
  async findAdminsByTenant(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Res() res: Response,
  ) {
    const result = await this.tenantService.findAdminsByTenant(tenantId);
    return res.status(result.status).json(result.data);
  }
}
