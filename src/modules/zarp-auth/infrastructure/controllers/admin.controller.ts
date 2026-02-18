import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AdminService } from '../../application/services/admin.service';
import { Request, Response } from 'express';
import AuthAdminDTO from '../../application/dtos/auth-admin.dto';
import { CreateAdminDTO, UpdateAdminRoleDTO } from '../../application/dtos/admin-management.dto';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { EAdminRole } from '../../domain/enums/admin-role.enum';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
    constructor(
        private readonly adminService: AdminService
    ) { }

    @Post('/authenticate')
    @ApiOperation({ summary: 'Authenticate administrator' })
    @ApiBody({ type: AuthAdminDTO })
    @ApiResponse({ status: 200, description: 'Authentication successful' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async authenticateAdmin(@Res() res: Response, @Body() data: AuthAdminDTO) {
        const result = await this.adminService.authenticate(data);
        return res.status(result.status).json(result.data)
    }

    @Get('/me')
    @UseGuards(AdminJwtGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get authenticated administrator data with role and tenants' })
    @ApiResponse({ status: 200, description: 'Administrator data returned' })
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
    @ApiOperation({ summary: 'Register a new admin (super_admin only)' })
    @ApiBody({ type: CreateAdminDTO })
    @ApiResponse({ status: 201, description: 'Admin created' })
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
    @ApiOperation({ summary: 'List all admins with their tenants (super_admin only)' })
    @ApiResponse({ status: 200, description: 'Admin list returned' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    async listAll(@Res() res: Response) {
        const result = await this.adminService.listAll();
        return res.status(result.status).json(result.data)
    }

    @Patch('/:id/role')
    @Roles(EAdminRole.super_admin)
    @UseGuards(AdminJwtGuard, RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update admin role (super_admin only)' })
    @ApiParam({ name: 'id', type: Number })
    @ApiBody({ type: UpdateAdminRoleDTO })
    @ApiResponse({ status: 200, description: 'Admin role updated' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 404, description: 'Admin not found' })
    async updateRole(
        @Param('id', ParseIntPipe) id: number,
        @Body() data: UpdateAdminRoleDTO,
        @Res() res: Response,
    ) {
        const result = await this.adminService.updateRole(id, data.role);
        return res.status(result.status).json(result.data)
    }

    @Patch('/:id/deactivate')
    @Roles(EAdminRole.super_admin)
    @UseGuards(AdminJwtGuard, RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Deactivate an admin (super_admin only)' })
    @ApiParam({ name: 'id', type: Number })
    @ApiResponse({ status: 200, description: 'Admin deactivated' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 404, description: 'Admin not found' })
    async deactivate(
        @Param('id', ParseIntPipe) id: number,
        @CurrentAdmin() admin: CurrentAdminPayload,
        @Res() res: Response,
    ) {
        const result = await this.adminService.deactivate(id, admin.admin_id);
        return res.status(result.status).json(result.data)
    }
}
