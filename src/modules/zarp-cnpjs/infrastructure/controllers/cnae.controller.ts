import { Controller, Get, Req, Res } from '@nestjs/common';
import { CnaeService } from '../../application/services/cnae.service';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('CNAE')
@Controller('cnae')
export class CnaeController {
    constructor(
        private readonly cnaeService: CnaeService
    ) { }

    @Get('/')
    @ApiOperation({ summary: 'List all CNAE codes' })
    @ApiResponse({ status: 200, description: 'CNAE codes returned' })
    async list(
        @Res() res: Response,
    ) {
        const result = await this.cnaeService.list();
        return res.status(result.status).json(result.data);
    }
}
