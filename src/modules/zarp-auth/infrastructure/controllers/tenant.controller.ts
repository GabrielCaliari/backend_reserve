import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
  ApiBody,
} from '@nestjs/swagger';
import { TenantService } from '../../application/services/tenant.service';
import { 
  CreateTenantDTO, 
  UpdateTenantDTO, 
  AssignAdminToTenantDTO,
  TenantResponseDTO,
  TenantWithAdminsDTO,
} from '../../application/dtos/tenant-management.dto';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { EAdminRole } from '../../domain/enums/admin-role.enum';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { ParseCuidPipe } from '../../../../shared/pipes';

@ApiTags('Tenant Management')
@ApiBearerAuth()
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post('/')
  @Roles(EAdminRole.super_admin)
  @UseGuards(AdminJwtGuard, RolesGuard)
  @ApiOperation({ 
    summary: 'Create a new tenant (super_admin only)',
    description: 'Creates a new tenant organization with unique slug'
  })
  @ApiBody({ type: CreateTenantDTO })
  @ApiResponse({ 
    status: 201, 
    description: 'Tenant created',
    type: TenantResponseDTO
  })
  @ApiResponse({ status: 400, description: 'Slug already exists' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async create(@Body() dto: CreateTenantDTO, @Res() res: Response) {
    const result = await this.tenantService.create(dto);
    return res.status(result.status).json(result.data);
  }

  @Get('/')
  @Roles(EAdminRole.super_admin)
  @UseGuards(AdminJwtGuard, RolesGuard)
  @ApiOperation({ 
    summary: 'List all tenants (super_admin only)',
    description: 'Returns all tenants with their associated admins'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Tenants listed',
    type: [TenantWithAdminsDTO]
  })
  async findAll(@Res() res: Response) {
    const result = await this.tenantService.findAll();
    return res.status(result.status).json(result.data);
  }

  @Get('/my-tenants')
  @UseGuards(AdminJwtGuard)
  @ApiOperation({ 
    summary: 'List tenants the authenticated admin belongs to',
    description: 'Returns tenants associated with the current admin. Super admins see all tenants.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Admin tenants listed',
    type: [TenantResponseDTO]
  })
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
  @ApiOperation({ 
    summary: 'Get tenant by ID (super_admin only)',
    description: 'Returns detailed information about a specific tenant'
  })
  @ApiParam({ name: 'id', type: String, description: 'Tenant CUID (25-character identifier)', example: 'cma1tenant001uvwxyzab345' })
  @ApiResponse({ 
    status: 200, 
    description: 'Tenant found',
    type: TenantWithAdminsDTO
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async findById(@Param('id', ParseCuidPipe) id: string, @Res() res: Response) {
    const result = await this.tenantService.findById(id);
    return res.status(result.status).json(result.data);
  }

  @Patch('/:id')
  @Roles(EAdminRole.super_admin)
  @UseGuards(AdminJwtGuard, RolesGuard)
  @ApiOperation({ 
    summary: 'Update tenant (super_admin only)',
    description: 'Updates tenant name, slug, or domain'
  })
  @ApiParam({ name: 'id', type: String, description: 'Tenant CUID (25-character identifier)', example: 'cma1tenant001uvwxyzab345' })
  @ApiBody({ type: UpdateTenantDTO })
  @ApiResponse({ 
    status: 200, 
    description: 'Tenant updated',
    type: TenantResponseDTO
  })
  @ApiResponse({ status: 400, description: 'Slug already exists' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async update(
    @Param('id', ParseCuidPipe) id: string,
    @Body() dto: UpdateTenantDTO,
    @Res() res: Response,
  ) {
    const result = await this.tenantService.update(id, dto);
    return res.status(result.status).json(result.data);
  }

  @Post('/assign')
  @Roles(EAdminRole.super_admin)
  @UseGuards(AdminJwtGuard, RolesGuard)
  @ApiOperation({ 
    summary: 'Assign admin to tenant (super_admin only)',
    description: 'Associates an administrator with a tenant organization'
  })
  @ApiBody({ type: AssignAdminToTenantDTO })
  @ApiResponse({ 
    status: 201, 
    description: 'Admin assigned to tenant',
    schema: {
      example: {
        id: 'cma1admtn0001ghijklmno23p',
        admin_id: 'cma1admin0001ghijklmno23p',
        tenant_id: 'cma1tenant001uvwxyzab345',
        role: 'manager',
        active: true
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Admin or tenant not found' })
  async assignAdmin(@Body() dto: AssignAdminToTenantDTO, @Res() res: Response) {
    const result = await this.tenantService.assignAdmin(dto.admin_id, dto.tenant_id);
    return res.status(result.status).json(result.data);
  }

  @Delete('/:tenantId/admins/:adminId')
  @Roles(EAdminRole.super_admin)
  @UseGuards(AdminJwtGuard, RolesGuard)
  @ApiOperation({ 
    summary: 'Remove admin from tenant (super_admin only)',
    description: 'Removes the association between an admin and a tenant'
  })
  @ApiParam({ name: 'tenantId', type: String, description: 'Tenant CUID (25-character identifier)', example: 'cma1tenant001uvwxyzab345' })
  @ApiParam({ name: 'adminId', type: String, description: 'Admin CUID (25-character identifier)', example: 'cma1admin0001ghijklmno23p' })
  @ApiResponse({ 
    status: 200, 
    description: 'Admin removed from tenant',
    schema: {
      example: {
        removed: true
      }
    }
  })
  async unassignAdmin(
    @Param('tenantId', ParseCuidPipe) tenantId: string,
    @Param('adminId', ParseCuidPipe) adminId: string,
    @Res() res: Response,
  ) {
    const result = await this.tenantService.unassignAdmin(adminId, tenantId);
    return res.status(result.status).json(result.data);
  }

  @Get('/:tenantId/admins')
  @Roles(EAdminRole.super_admin)
  @UseGuards(AdminJwtGuard, RolesGuard)
  @ApiOperation({ 
    summary: 'List admins of a tenant (super_admin only)',
    description: 'Returns all administrators associated with a specific tenant'
  })
  @ApiParam({ name: 'tenantId', type: String, description: 'Tenant CUID (25-character identifier)', example: 'cma1tenant001uvwxyzab345' })
  @ApiResponse({ 
    status: 200, 
    description: 'Tenant admins listed',
    schema: {
      example: [
        {
          id: 'cma1admin0001ghijklmno23p',
          name: 'John Doe',
          email: 'john@company.com',
          role: 'manager',
          active: true
        }
      ]
    }
  })
  async findAdminsByTenant(
    @Param('tenantId', ParseCuidPipe) tenantId: string,
    @Res() res: Response,
  ) {
    const result = await this.tenantService.findAdminsByTenant(tenantId);
    return res.status(result.status).json(result.data);
  }

  @Patch('/:id/deactivate')
  @Roles(EAdminRole.super_admin)
  @UseGuards(AdminJwtGuard, RolesGuard)
  @ApiOperation({ 
    summary: 'Deactivate tenant (super_admin only)',
    description: 'Deactivates a tenant organization'
  })
  @ApiParam({ name: 'id', type: String, description: 'Tenant CUID (25-character identifier)', example: 'cma1tenant001uvwxyzab345' })
  @ApiResponse({ 
    status: 200, 
    description: 'Tenant deactivated',
    schema: {
      example: {
        id: 'cma1tenant001uvwxyzab345',
        active: false
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async deactivate(
    @Param('id', ParseCuidPipe) id: string,
    @Res() res: Response,
  ) {
    const result = await this.tenantService.deactivate(id);
    return res.status(result.status).json(result.data);
  }

  @Patch('/:id/activate')
  @Roles(EAdminRole.super_admin)
  @UseGuards(AdminJwtGuard, RolesGuard)
  @ApiOperation({ 
    summary: 'Activate tenant (super_admin only)',
    description: 'Reactivates a previously deactivated tenant'
  })
  @ApiParam({ name: 'id', type: String, description: 'Tenant CUID (25-character identifier)', example: 'cma1tenant001uvwxyzab345' })
  @ApiResponse({ 
    status: 200, 
    description: 'Tenant activated',
    schema: {
      example: {
        id: 'cma1tenant001uvwxyzab345',
        active: true
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async activate(
    @Param('id', ParseCuidPipe) id: string,
    @Res() res: Response,
  ) {
    const result = await this.tenantService.activate(id);
    return res.status(result.status).json(result.data);
  }

  @Delete('/:id')
  @Roles(EAdminRole.super_admin)
  @UseGuards(AdminJwtGuard, RolesGuard)
  @ApiOperation({ 
    summary: 'Delete tenant permanently (super_admin only)',
    description: 'Permanently deletes a tenant and all its associations'
  })
  @ApiParam({ name: 'id', type: String, description: 'Tenant CUID (25-character identifier)', example: 'cma1tenant001uvwxyzab345' })
  @ApiResponse({ 
    status: 200, 
    description: 'Tenant deleted',
    schema: {
      example: {
        deleted: true
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async delete(
    @Param('id', ParseCuidPipe) id: string,
    @Res() res: Response,
  ) {
    const result = await this.tenantService.delete(id);
    return res.status(result.status).json(result.data);
  }

  @Patch('/:tenantId/admins/:adminId/role')
  @Roles(EAdminRole.super_admin)
  @UseGuards(AdminJwtGuard, RolesGuard)
  @ApiOperation({ 
    summary: 'Update admin role in tenant (super_admin only)',
    description: 'Changes the role of an admin within a specific tenant'
  })
  @ApiParam({ name: 'tenantId', type: String, description: 'Tenant CUID (25-character identifier)', example: 'cma1tenant001uvwxyzab345' })
  @ApiParam({ name: 'adminId', type: String, description: 'Admin CUID (25-character identifier)', example: 'cma1admin0001ghijklmno23p' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        role: {
          type: 'string',
          enum: ['manager', 'editor', 'viewer'],
          example: 'manager'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Admin role updated in tenant',
    schema: {
      example: {
        id: 'cma1admtn0001ghijklmno23p',
        admin_id: 'ckl1234abcd5',
        tenant_id: 'cma1tenant001uvwxyzab345',
        role: 'manager',
        active: true
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Admin or tenant not found' })
  async updateAdminRole(
    @Param('tenantId', ParseCuidPipe) tenantId: string,
    @Param('adminId', ParseCuidPipe) adminId: string,
    @Body() dto: { role: EAdminRole },
    @Res() res: Response,
  ) {
    const result = await this.tenantService.updateAdminRole(adminId, tenantId, dto.role);
    return res.status(result.status).json(result.data);
  }
}