import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Request, Response } from 'express';
import AuthAdminValidator from 'src/common/validators/admin/auth-admin.validator';
import { AdminValidateJwtTokenGuard } from 'src/common/guards/admin-validate-jwt-token/admin-validate-jwt-token.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
    constructor(
        private readonly adminService: AdminService
    ) { }

    @Post('/authenticate')
    @ApiOperation({ summary: 'Autenticar administrador' })
    @ApiBody({ type: AuthAdminValidator })
    @ApiResponse({ status: 200, description: 'Autenticação realizada com sucesso' })
    @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
    async authenticateAdmin(@Res() res: Response, @Body() data: AuthAdminValidator) {
        const result = await this.adminService.authenticate(data);
        return res.status(result.status).json(result.data)
    }

    @Get('/me')
    @UseGuards(AdminValidateJwtTokenGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Obter dados do administrador autenticado' })
    @ApiResponse({ status: 200, description: 'Dados do administrador retornados' })
    @ApiResponse({ status: 401, description: 'Token inválido ou expirado' })
    async me(
        @Res() res: Response,
        @Req() req: Request & { admin_id: number },
    ) {
        const adminId = req.admin_id;
        const result = await this.adminService.me(adminId);
        return res.status(result.status).json(result.data)
    }
}
