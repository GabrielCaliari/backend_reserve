import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AdminService } from '../../application/services/admin.service';
import { Request, Response } from 'express';
import AuthAdminDTO from '@/modules/zarp-auth/application/dtos/auth-admin.dto';
import { AdminJwtGuard } from '@/shared/auth/guards';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

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
    @ApiOperation({ summary: 'Get authenticated administrator data' })
    @ApiResponse({ status: 200, description: 'Administrator data returned' })
    @ApiResponse({ status: 401, description: 'Invalid or expired token' })
    async me(
        @Res() res: Response,
        @Req() req: Request & { admin_id: number },
    ) {
        const adminId = req.admin_id;
        const result = await this.adminService.me(adminId);
        return res.status(result.status).json(result.data)
    }
}
