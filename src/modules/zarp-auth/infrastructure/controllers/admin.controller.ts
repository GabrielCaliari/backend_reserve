import { Body, Controller, Get, Param, Patch, Post, Res, UseGuards, Delete } from '@nestjs/common';
import { AdminService } from '../../application/services/admin.service';
import { Response } from 'express';
import AuthAdminDTO from '../../application/dtos/auth-admin.dto';
import { CreateAdminDTO, UpdateAdminRoleDTO, UpdateAdminDTO, AdminResponseDTO, AdminListItemDTO } from '../../application/dtos/admin-management.dto';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { EAdminRole } from '../../domain/enums/admin-role.enum';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import { ParseCuidPipe } from '../../../../shared/pipes';

@ApiTags('Admin Management')
@Controller('admin')
export class AdminController {
    constructor(
        private readonly adminService: AdminService
    ) { }

    @Post('/authenticate')
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
    @Roles(EAdminRole.super_admin)
    @UseGuards(AdminJwtGuard, RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ 
        summary: 'Register a new admin (super_admin only)',
        description: 'Creates a new administrator account. Only accessible by super_admin users.'
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
    async register(@Res() res: Response, @Body() data: CreateAdminDTO) {
        const result = await this.adminService.register(data);
        return res.status(result.status).json(result.data)
    }

    @Get('/list')
    @Roles(EAdminRole.super_admin)
    @UseGuards(AdminJwtGuard, RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ 
        summary: 'List all admins (super_admin only)',
        description: 'Returns a list of all administrators with their associated tenants'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Admin list returned',
        type: [AdminListItemDTO]
    })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    async listAll(@Res() res: Response) {
        const result = await this.adminService.listAll();
        return res.status(result.status).json(result.data)
    }

    @Patch('/:id/role')
    @Roles(EAdminRole.super_admin)
    @UseGuards(AdminJwtGuard, RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ 
        summary: 'Update admin role (super_admin only)',
        description: 'Changes the role of an administrator'
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
        const result = await this.adminService.updateRole(id, data.role, admin.admin_id);
        return res.status(result.status).json(result.data)
    }

    @Patch('/:id/deactivate')
    @Roles(EAdminRole.super_admin)
    @UseGuards(AdminJwtGuard, RolesGuard)
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
    @Roles(EAdminRole.super_admin)
    @UseGuards(AdminJwtGuard, RolesGuard)
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
    @Roles(EAdminRole.super_admin)
    @UseGuards(AdminJwtGuard, RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ 
        summary: 'Get admin by ID (super_admin only)',
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
    @Roles(EAdminRole.super_admin)
    @UseGuards(AdminJwtGuard, RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ 
        summary: 'Update admin data (super_admin only)',
        description: 'Updates administrator name and/or email'
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
        @Res() res: Response,
    ) {
        const result = await this.adminService.update(id, data);
        return res.status(result.status).json(result.data)
    }

    @Delete('/:id')
    @Roles(EAdminRole.super_admin)
    @UseGuards(AdminJwtGuard, RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ 
        summary: 'Delete admin permanently (super_admin only)',
        description: 'Permanently deletes an administrator account. Cannot delete yourself.'
    })
    @ApiParam({ name: 'id', type: String, description: 'Admin CUID (25-character identifier)', example: 'cma1admin0001ghijklmno23p' })
    @ApiResponse({ 
        status: 200, 
        description: 'Admin deleted',
        schema: {
            example: {
                deleted: true
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Cannot delete self' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 404, description: 'Admin not found' })
    async delete(
        @Param('id', ParseCuidPipe) id: string,
        @CurrentAdmin() admin: CurrentAdminPayload,
        @Res() res: Response,
    ) {
        const result = await this.adminService.delete(id, admin.admin_id);
        return res.status(result.status).json(result.data)
    }
}
