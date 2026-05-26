import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '../../application/services/config.service';
import { CreateSmtpServerDTO } from '../../application/dtos/config.dto';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { EAdminRole } from '../../../reserve-auth/domain/enums/admin-role.enum';

@ApiTags('Config (SMTP Server)')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, RolesGuard)
@Roles(EAdminRole.super_admin)
@Controller()
export class ConfigController {
    public constructor(
        private readonly configService: ConfigService
    ) { }

    @Post('/smtp-server')
    @ApiOperation({ summary: 'Create SMTP server', description: 'Creates a new SMTP server or email provider configuration' })
    @ApiResponse({ status: 201, description: 'SMTP server created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid data' })
    @ApiResponse({ status: 500, description: 'Failed to create SMTP server' })
    async createSmtpServer(
        @Body() body: CreateSmtpServerDTO,
        @Req() req: Request,
        @Res() res: Response
    ) {
        const response = await this.configService.createSmtpServer({
            name: body.name,
            email: body.email,
            provider: body.provider,
            default: body.default,
            ...(body.smtp ? { smtp: body.smtp } : {}),
            ...(body.api ? { api: body.api } : {})
        });
        return res.status(response.status).json(response.data);
    }

    @Get('/smtp-server')
    @ApiOperation({ summary: 'List SMTP servers', description: 'Returns all configured SMTP servers' })
    @ApiResponse({ status: 200, description: 'SMTP server list' })
    @ApiResponse({ status: 500, description: 'Failed to fetch SMTP servers' })
    async findSmtpServers(
        @Req() req: Request,
        @Res() res: Response
    ) {
        const response = await this.configService.findSmtpServers();
        return res.status(response.status).json(response.data);
    }
}
