import { Controller, Get, Req, Res } from '@nestjs/common';
import { CnaeService } from '../../application/services/cnae.service';
import { Request, Response } from 'express';

@Controller('cnae')
export class CnaeController {
    constructor(
        private readonly cnaeService: CnaeService
    ) { }

    @Get('/')
    async list(
        @Res() res: Response,
    ) {
        const result = await this.cnaeService.list();
        return res.status(result.status).json(result.data);
    }
}
