import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { UserValidateJwtTokenGuard } from 'src/common/guards/user-validate-jwt-token/user-validate-jwt-token.guard';
import SendMessageValidator from 'src/common/validators/brand-analysis/Brand-analysis.validator';
import { BrandAnalysisService } from './brand-analysis.service';
import { Request, Response } from 'express';
import FindByUserAndIdValidator from 'src/common/validators/brand/Find-by-user-and-id.validator';

@Controller('brand-analysis')
export class BrandAnalysisController {
    constructor(
        private readonly brandAnalysisService: BrandAnalysisService,
    ) { }

    @Post('/')
    @UseGuards(UserValidateJwtTokenGuard)
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
    @UseGuards(UserValidateJwtTokenGuard)
    async findByUser(
        @Res() res: Response,
        @Req() req: Request & { user_id: number }
    ) {
        const userId = req.user_id;
        const result = await this.brandAnalysisService.findByUser(userId);
        return res.status(result.status).json(result.data);
    }

    @Get('/:id')
    @UseGuards(UserValidateJwtTokenGuard)
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
