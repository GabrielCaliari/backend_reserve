import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { UserJwtGuard } from '@/shared/auth/guards';
import SendMessageValidator from '@/common/validators/brand-analysis/Brand-analysis.validator';
import { BrandAnalysisService } from '../../application/services/brand-analysis.service';
import { Request, Response } from 'express';
import FindByUserAndIdValidator from '@/common/validators/brand/Find-by-user-and-id.validator';

@Controller('brand-analysis')
export class BrandAnalysisController {
    constructor(
        private readonly brandAnalysisService: BrandAnalysisService,
    ) { }

    @Post('/')
    @UseGuards(UserJwtGuard)
    async sendMessage(
        @Body() rows: SendMessageValidator,
        @Res() res: Response,
        @Req() req: Request & { user_id: number }
    ) {
        const userId = req.user_id;
        const result = await this.brandAnalysisService.sendMessage(
            rows.brand,
            rows.niche,
            rows.description,
            userId
        );

        return res.status(result.status).json(result.data);
    }

    @Get('/')
    @UseGuards(UserJwtGuard)
    async findByUser(
        @Res() res: Response,
        @Req() req: Request & { user_id: number }
    ) {
        const userId = req.user_id;
        const result = await this.brandAnalysisService.findByUser(userId);
        return res.status(result.status).json(result.data);
    }

    @Get('/:id')
    @UseGuards(UserJwtGuard)
    async findByUserAndId(
        @Param() params: FindByUserAndIdValidator,
        @Res() res: Response,
        @Req() req: Request & { user_id: number }
    ) {
        const userId = req.user_id;
        const result = await this.brandAnalysisService.findByUserAndId(+params.id, userId);
        return res.status(result.status).json(result.data);
    }
}
