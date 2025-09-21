import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Request, Response } from 'express';
import AuthAdminValidator from 'src/common/validators/admin/auth-admin.validator';
import { AdminValidateJwtTokenGuard } from 'src/common/guards/admin-validate-jwt-token/admin-validate-jwt-token.guard';

@Controller('admin')
export class AdminController {
    constructor(
        private readonly adminService: AdminService
    ) { }

    @Post('/authenticate')
    async authenticateAdmin(@Res() res: Response, @Body() data: AuthAdminValidator) {
        const result = await this.adminService.authenticate(data);
        return res.status(result.status).json(result.data)
    }

    @Get('/me')
    @UseGuards(AdminValidateJwtTokenGuard)
    async me(
        @Res() res: Response,
        @Req() req: Request & { admin_id: number },
    ) {
        const adminId = req.admin_id;
        const result = await this.adminService.me(adminId);
        return res.status(result.status).json(result.data)
    }
}
