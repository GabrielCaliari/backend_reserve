import { Body, Controller, Get, Headers, Param, Patch, Post, Res, UseGuards, Delete } from '@nestjs/common';
import { AdminService } from '../../application/services/admin.service';
import { Response } from 'express';
import AuthAdminDTO from '../../application/dtos/auth-admin.dto';
import { CreateAdminDTO, UpdateAdminRoleDTO, UpdateAdminDTO, AdminResponseDTO, AdminListItemDTO, ScheduleAdminDeletionDTO, AdminDeletionStatusDTO } from '../../application/dtos/admin-management.dto';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { EAdminRole } from '../../domain/enums/admin-role.enum';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ParseCuidPipe } from '../../../../shared/pipes';
import { Public } from '../../../../shared/auth/decorators/public.decorator';

function normalizeAdminRole(role: EAdminRole): EAdminRole {
    return role === EAdminRole.company_admin ? EAdminRole.manager : role;
}

@ApiTags('Admin Management')
@Controller('admin')
export class AdminController {
    constructor(
        private readonly adminService: AdminService
    ) { }

    @Post('/authenticate')
    @Public()
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @ApiOperation({
        summary: 'Authenticate administrator',
        description: 'Authenticates an admin user and returns a session token'
    })
    @ApiBody({ type: AuthAdminDTO })
    @ApiResponse({ 
        status: 200, 
        description: 'Authentication successful',
        schema: {
            example: {
                session_id: 'cma1sessn0001ghijklmno23p',
                session_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                details: {
                    name: 'John Doe',
                    email: 'john@company.com',
                    role: 'super_admin'
                }
            }
        }
    })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    @ApiResponse({ status: 403, description: 'Admin account deactivated' })
    @ApiResponse({ status: 423, description: 'Conta bloqueada por tentativas de senha incorretas' })
    async authenticateAdmin(@Res() res: Response, @Body() data: AuthAdminDTO) {
        const result = await this.adminService.authenticate(data);
        return res.status(result.status).json(result.data)
    }

    @Get('/me')
    @UseGuards(AdminJwtGuard)
    @ApiBearerAuth()
    @ApiOperation({ 
        summary: 'Get authenticated administrator data',
        description: 'Returns the current admin profile with role and associated tenants'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Administrator data returned',
        type: AdminResponseDTO
    })
    @ApiResponse({ status: 401, description: 'Invalid or expired token' })
    async me(
        @CurrentAdmin() admin: CurrentAdminPayload,
        @Res() res: Response,
    ) {
        const result = await this.adminService.me(admin.admin_id);
        return res.status(result.status).json(result.data)
    }

    @Post('/register')
    @RequirePermissions('admins.create')
    @UseGuards(AdminJwtGuard, PermissionsGuard)
    @ApiBearerAuth()
    @ApiOperation({ 
        summary: 'Register a new admin (super_admin or manager)',
        description: 'Creates a new administrator account. Managers cannot create super_admin or owner accounts.'
    })
    @ApiBody({ type: CreateAdminDTO })
    @ApiResponse({ 
        status: 201, 
        description: 'Admin created successfully',
        schema: {
            example: {
                id: 'cma1admin0001ghijklmno23p',
                name: 'John Doe',
                email: 'john@company.com',
                role: 'manager'
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Email already exists' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    async register(
        @Res() res: Response,
        @Body() data: CreateAdminDTO,
        @CurrentAdmin() admin: CurrentAdminPayload,
    ) {
        const callerRole = normalizeAdminRole((admin.admin_role ?? EAdminRole.manager) as EAdminRole);
        const result = await this.adminService.register(data, callerRole);
        return res.status(result.status).json(result.data)
    }

    @Get('/list')
    @RequirePermissions('admins.read')
    @UseGuards(AdminJwtGuard, PermissionsGuard)
    @ApiBearerAuth()
    @ApiOperation({ 
        summary: 'List admins (super_admin or manager)',
        description: 'Super admins see all admins. Managers only see admins with roles below super_admin/owner. When x-tenant-id header is present, filters admins belonging to that tenant.'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Admin list returned',
        type: [AdminListItemDTO]
    })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    async listAll(
        @Res() res: Response,
        @CurrentAdmin() admin: CurrentAdminPayload,
        @Headers('x-tenant-id') tenantId?: string,
    ) {
        const callerRole = normalizeAdminRole((admin.admin_role ?? EAdminRole.manager) as EAdminRole);
        const result = await this.adminService.listAll(1, 20, callerRole, tenantId || undefined);
        return res.status(result.status).json(result.data)
    }

    @Patch('/:id/role')
    @RequirePermissions('admins.role.update')
    @UseGuards(AdminJwtGuard, PermissionsGuard)
    @ApiBearerAuth()
    @ApiOperation({ 
        summary: 'Update admin role (super_admin or manager)',
        description: 'Changes the role of an administrator. Managers cannot assign super_admin or owner roles.'
    })
    @ApiParam({ name: 'id', type: String, description: 'Admin CUID (25-character identifier)', example: 'cma1admin0001ghijklmno23p' })
    @ApiBody({ type: UpdateAdminRoleDTO })
    @ApiResponse({ 
        status: 200, 
        description: 'Admin role updated',
        schema: {
            example: {
                id: 'cma1admin0001ghijklmno23p',
                name: 'John Doe',
                role: 'manager'
            }
        }
    })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 404, description: 'Admin not found' })
    async updateRole(
        @Param('id', ParseCuidPipe) id: string,
        @CurrentAdmin() admin: CurrentAdminPayload,
        @Body() data: UpdateAdminRoleDTO,
        @Res() res: Response,
    ) {
        const callerRole = normalizeAdminRole((admin.admin_role ?? EAdminRole.manager) as EAdminRole);
        const result = await this.adminService.updateRole(id, data.role, admin.admin_id, callerRole);
        return res.status(result.status).json(result.data)
    }

    @Patch('/:id/deactivate')
    @RequirePermissions('admins.deactivate')
    @UseGuards(AdminJwtGuard, PermissionsGuard)
    @ApiBearerAuth()
    @ApiOperation({ 
        summary: 'Deactivate an admin (super_admin only)',
        description: 'Deactivates an administrator account. Cannot deactivate yourself.'
    })
    @ApiParam({ name: 'id', type: String, description: 'Admin CUID (25-character identifier)', example: 'cma1admin0001ghijklmno23p' })
    @ApiResponse({ 
        status: 200, 
        description: 'Admin deactivated',
        schema: {
            example: {
                id: 'cma1admin0001ghijklmno23p',
                active: false
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Cannot deactivate self' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 404, description: 'Admin not found' })
    async deactivate(
        @Param('id', ParseCuidPipe) id: string,
        @CurrentAdmin() admin: CurrentAdminPayload,
        @Res() res: Response,
    ) {
        const result = await this.adminService.deactivate(id, admin.admin_id);
        return res.status(result.status).json(result.data)
    }

    @Patch('/:id/activate')
    @RequirePermissions('admins.activate')
    @UseGuards(AdminJwtGuard, PermissionsGuard)
    @ApiBearerAuth()
    @ApiOperation({ 
        summary: 'Activate an admin (super_admin only)',
        description: 'Reactivates a previously deactivated administrator account'
    })
    @ApiParam({ name: 'id', type: String, description: 'Admin CUID (25-character identifier)', example: 'cma1admin0001ghijklmno23p' })
    @ApiResponse({ 
        status: 200, 
        description: 'Admin activated',
        schema: {
            example: {
                id: 'cma1admin0001ghijklmno23p',
                active: true
            }
        }
    })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 404, description: 'Admin not found' })
    async activate(
        @Param('id', ParseCuidPipe) id: string,
        @Res() res: Response,
    ) {
        const result = await this.adminService.activate(id);
        return res.status(result.status).json(result.data)
    }

    @Get('/:id')
    @RequirePermissions('admins.read')
    @UseGuards(AdminJwtGuard, PermissionsGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get admin by ID (super_admin or manager)',
        description: 'Returns detailed information about a specific administrator'
    })
    @ApiParam({ name: 'id', type: String, description: 'Admin CUID (25-character identifier)', example: 'cma1admin0001ghijklmno23p' })
    @ApiResponse({ 
        status: 200, 
        description: 'Admin found',
        type: AdminResponseDTO
    })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 404, description: 'Admin not found' })
    async findById(
        @Param('id', ParseCuidPipe) id: string,
        @Res() res: Response,
    ) {
        const result = await this.adminService.findById(id);
        return res.status(result.status).json(result.data)
    }

    @Patch('/:id')
    @RequirePermissions('admins.update')
    @UseGuards(AdminJwtGuard, PermissionsGuard)
    @ApiBearerAuth()
    @ApiOperation({ 
        summary: 'Update admin data (super_admin or manager)',
        description: 'Updates administrator name and/or email. Only super_admin can update password.'
    })
    @ApiParam({ name: 'id', type: String, description: 'Admin CUID (25-character identifier)', example: 'cma1admin0001ghijklmno23p' })
    @ApiBody({ type: UpdateAdminDTO })
    @ApiResponse({ 
        status: 200, 
        description: 'Admin updated',
        schema: {
            example: {
                id: 'cma1admin0001ghijklmno23p',
                name: 'John Doe Updated',
                email: 'john.new@company.com'
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Email already exists' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 404, description: 'Admin not found' })
    async update(
        @Param('id', ParseCuidPipe) id: string,
        @Body() data: UpdateAdminDTO,
        @CurrentAdmin() admin: CurrentAdminPayload,
        @Res() res: Response,
    ) {
        const result = await this.adminService.update(id, data, admin.admin_role as EAdminRole | undefined);
        return res.status(result.status).json(result.data)
    }

    @Delete('/:id')
    @RequirePermissions('admins.delete')
    @UseGuards(AdminJwtGuard, PermissionsGuard)
    @ApiBearerAuth()
    @ApiOperation({ 
        summary: 'Schedule admin deletion (super_admin only)',
        description: 'Deactivates the admin immediately and schedules permanent deletion after 7 days'
    })
    @ApiParam({ name: 'id', type: String, description: 'Admin CUID (25-character identifier)', example: 'cma1admin0001ghijklmno23p' })
    @ApiBody({ type: ScheduleAdminDeletionDTO, required: false })
    @ApiResponse({ 
        status: 200, 
        description: 'Admin deletion scheduled',
        schema: {
            example: {
                id: 'cma1admin0001ghijklmno23p',
                active: false,
                scheduled_for_deletion: true,
                deletion_scheduled_for_at: '2026-05-21T12:00:00.000Z'
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Cannot delete self' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 404, description: 'Admin not found' })
    @ApiResponse({ status: 409, description: 'Admin deletion already scheduled' })
    async scheduleDeletion(
        @Param('id', ParseCuidPipe) id: string,
        @CurrentAdmin() admin: CurrentAdminPayload,
        @Body() dto: ScheduleAdminDeletionDTO,
        @Res() res: Response,
    ) {
        const result = await this.adminService.scheduleDeletion(id, admin.admin_id, dto);
        return res.status(result.status).json(result.data)
    }

    @Post('/:id/restore-deletion')
    @RequirePermissions('admins.delete')
    @UseGuards(AdminJwtGuard, PermissionsGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Restore admin scheduled for deletion (super_admin only)',
        description: 'Cancels the deletion window and restores admin access before the 7-day purge deadline'
    })
    @ApiParam({ name: 'id', type: String, description: 'Admin CUID (25-character identifier)', example: 'cma1admin0001ghijklmno23p' })
    @ApiResponse({ status: 200, description: 'Admin restored', type: AdminResponseDTO })
    @ApiResponse({ status: 404, description: 'Admin not found' })
    @ApiResponse({ status: 409, description: 'Admin deletion is not scheduled' })
    async restoreDeletion(
        @Param('id', ParseCuidPipe) id: string,
        @Res() res: Response,
    ) {
        const result = await this.adminService.restoreDeletion(id);
        return res.status(result.status).json(result.data)
    }

    @Get('/:id/deletion-status')
    @RequirePermissions('admins.deletion-status.read')
    @UseGuards(AdminJwtGuard, PermissionsGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get admin deletion status (super_admin only)',
        description: 'Returns whether the admin is scheduled for deletion and related metadata'
    })
    @ApiParam({ name: 'id', type: String, description: 'Admin CUID (25-character identifier)', example: 'cma1admin0001ghijklmno23p' })
    @ApiResponse({ status: 200, description: 'Deletion status', type: AdminDeletionStatusDTO })
    @ApiResponse({ status: 404, description: 'Admin not found' })
    async getDeletionStatus(
        @Param('id', ParseCuidPipe) id: string,
        @Res() res: Response,
    ) {
        const result = await this.adminService.getDeletionStatus(id);
        return res.status(result.status).json(result.data)
    }
}
