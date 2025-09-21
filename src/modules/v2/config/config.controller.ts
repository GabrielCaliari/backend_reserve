import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from './config.service';
import { CreateSmtpServerDTO } from './config.dto';
import { Request, Response } from 'express';

@Controller()
export class ConfigController {
    public constructor(
        private readonly configService: ConfigService
    ) { }

    @Post('/smtp-server')
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
    async findSmtpServers(
        @Req() req: Request,
        @Res() res: Response
    ) {
        const response = await this.configService.findSmtpServers();
        return res.status(response.status).json(response.data);
    }
}
