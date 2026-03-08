import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { UserJwtGuard } from '../../../../shared/auth/guards';
import BrandAnalysisMessageDTO from '../../application/dtos/brand-analysis-message.dto';
import { BrandAnalysisService } from '../../application/services/brand-analysis.service';
import { Request, Response } from 'express';
import FindByUserAndIdDTO from '../../application/dtos/find-by-user-and-id.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';

@ApiTags('Brand Analysis')
@Controller('brand-analysis')
export class BrandAnalysisController {
    constructor(
        private readonly brandAnalysisService: BrandAnalysisService,
    ) { }

    @Post('/')
    @UseGuards(UserJwtGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Send a brand analysis message (AI-powered)' })
    @ApiBody({ type: BrandAnalysisMessageDTO })
    @ApiResponse({ status: 200, description: 'Brand analysis result returned' })
    @ApiResponse({ status: 401, description: 'Invalid or expired token' })
    async sendMessage(

        @Body() rows: BrandAnalysisMessageDTO,
        @Res() res: Response,
        @Req() req: Request & { user_id: string }
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
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List all brand analyses for the authenticated user' })
    @ApiResponse({ status: 200, description: 'Brand analyses returned' })
    @ApiResponse({ status: 401, description: 'Invalid or expired token' })
    async findByUser(
        @Res() res: Response,
        @Req() req: Request & { user_id: string }
    ) {
        const userId = req.user_id;
        const result = await this.brandAnalysisService.findByUser(userId);
        return res.status(result.status).json(result.data);
    }

    @Get('/:id')
    @UseGuards(UserJwtGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get a specific brand analysis by ID' })
    @ApiParam({ name: 'id', description: 'Brand analysis ID' })
    @ApiResponse({ status: 200, description: 'Brand analysis returned' })
    @ApiResponse({ status: 404, description: 'Brand analysis not found' })
    async findByUserAndId(
        @Param() params: FindByUserAndIdDTO,
        @Res() res: Response,
        @Req() req: Request & { user_id: string }
    ) {
        const userId = req.user_id;
        const result = await this.brandAnalysisService.findByUserAndId(params.id, userId);
        return res.status(result.status).json(result.data);
    }
}
