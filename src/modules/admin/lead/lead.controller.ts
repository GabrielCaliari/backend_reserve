import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { LeadService } from './lead.service';
import { Request, Response } from 'express';
import { AdminValidateJwtTokenGuard } from 'src/common/guards/admin-validate-jwt-token/admin-validate-jwt-token.guard';

@Controller('admin/lead')
export class LeadController {
    constructor(
        private readonly leadService: LeadService
    ) { }

    @Get('/list/trademark-registration')
    @UseGuards(AdminValidateJwtTokenGuard)
    async listTrademarkRegistrationLead(
        @Res() res: Response,
    ) {
        const result = await this.leadService.listTrademarkRegistrationLead();
        return res.status(result.status).json(result.data);
    }

    // TODO: Adicionar validação
    @Post('/update/trademark-registration/:phone_number_id')
    @UseGuards(AdminValidateJwtTokenGuard)
    async updateTrademarkRegistrationLead(
        @Res() res: Response,
        @Req() req: Request & { admin_id: number },
        @Param() params: { phone_number_id: string },
        @Body() data: { card: string }
    ) {
        const result = await this.leadService.updateKBCard({
            kb_card: data.card,
            phone_number_id: params.phone_number_id
        });
        return res.status(result.status).json(result.data);
    }

    // TODO: Adicionar validação
    @Post('/update/lead-qualification/screening-complete/:phone_number_id')
    @UseGuards(AdminValidateJwtTokenGuard)
    async screeningComplete(
        @Res() res: Response,
        @Req() req: Request & { admin_id: number },
        @Param() params: { phone_number_id: string },
    ) {
        const result = await this.leadService.screeningComplete({ phone_number_id: params.phone_number_id });
        return res.status(result.status).json(result.data);
    }
    
    // TODO: Adicionar validação
    @Post('/temperature-analysis/lead-qualification/:phone_number_id')
    @UseGuards(AdminValidateJwtTokenGuard)
    async temperatureAnalysisByMessageId(
        @Res() res: Response,
        @Req() req: Request & { admin_id: number },
        @Param() params: { phone_number_id: string },
    ) {
        const result = await this.leadService.temperatureAnalysisByMessageId({ phone_number_id: params.phone_number_id });
        return res.status(result.status).json(result.data);
    }
}
