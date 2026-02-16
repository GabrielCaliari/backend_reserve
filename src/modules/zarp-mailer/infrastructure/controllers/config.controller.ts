import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '../../application/services/config.service';
import { CreateSmtpServerDTO } from '../../application/dtos/config.dto';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Config (SMTP Server)')
@Controller()
export class ConfigController {
    public constructor(
        private readonly configService: ConfigService
    ) { }

    @Post('/smtp-server')
    @ApiOperation({ summary: 'Criar servidor SMTP', description: 'Cria uma nova configuração de servidor SMTP ou provedor de email' })
    @ApiResponse({ status: 201, description: 'Servidor SMTP criado com sucesso' })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    @ApiResponse({ status: 500, description: 'Erro ao criar servidor SMTP' })
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
    @ApiOperation({ summary: 'Listar servidores SMTP', description: 'Retorna todos os servidores SMTP configurados' })
    @ApiResponse({ status: 200, description: 'Lista de servidores SMTP' })
    @ApiResponse({ status: 500, description: 'Erro ao buscar servidores SMTP' })
    async findSmtpServers(
        @Req() req: Request,
        @Res() res: Response
    ) {
        const response = await this.configService.findSmtpServers();
        return res.status(response.status).json(response.data);
    }
}
