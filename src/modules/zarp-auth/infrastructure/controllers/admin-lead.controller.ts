import { Body, Controller, Get, Param, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import { LeadService } from '../../application/services/admin-lead.service';
import { Request, Response } from 'express';
import { AdminJwtGuard } from '@/shared/auth/guards';
import { ELeadStatus } from '@/@types/@lead';

// TODO: Adicionar o log para toda ação que seja feito por um admin
@Controller('admin/lead')
export class LeadController {
    constructor(
        private readonly leadService: LeadService
    ) { }

    // @Get('/list/trademark-registration')
    // @UseGuards(AdminJwtGuard)
    // async listTrademarkRegistrationLead(
    //     @Res() res: Response,
    // ) {
    //     const result = await this.leadService.listTrademarkRegistrationLead();
    //     return res.status(result.status).json(result.data);
    // }

    // @Get('/list')
    // @UseGuards(AdminJwtGuard)
    // async listLead(
    //     @Res() res: Response,
    //     @Query() query: { page?: number; limit?: number }
    // ) {
    //     const page = Number(query.page) || 1;
    //     const limit = Number(query.limit) || 10;
    //     const result = await this.leadService.listLead({ page, limit });
    //     return res.status(result.status).json(result.data);
    // }

    // TODO: Adicionar validação
    // @Put('/update/general-lead/:lead_id')
    // @UseGuards(AdminJwtGuard)
    // async updateLead(
    //     @Res() res: Response,
    //     @Req() req: Request & { admin_id: number },
    //     @Param() params: { lead_id: string },
    //     @Body() data: { status: ELeadStatus }
    // ) {
    //     const result = await this.leadService.updateLead({
    //         status: data.status,
    //         lead_id: Number(params.lead_id)
    //     });
    //     return res.status(result.status).json(result.data);
    // }

    // // TODO: Adicionar validação
    // @Post('/update/trademark-registration/:phone_number_id')
    // @UseGuards(AdminJwtGuard)
    // async updateTrademarkRegistrationLead(
    //     @Res() res: Response,
    //     @Req() req: Request & { admin_id: number },
    //     @Param() params: { phone_number_id: string },
    //     @Body() data: { card: string }
    // ) {
    //     const result = await this.leadService.updateKBCard({
    //         kb_card: data.card,
    //         phone_number_id: params.phone_number_id
    //     });
    //     return res.status(result.status).json(result.data);
    // }

    // // TODO: Adicionar validação
    // @Post('/update/lead-qualification/screening-complete/:phone_number_id')
    // @UseGuards(AdminJwtGuard)
    // async screeningComplete(
    //     @Res() res: Response,
    //     @Req() req: Request & { admin_id: number },
    //     @Param() params: { phone_number_id: string },
    // ) {
    //     const result = await this.leadService.screeningComplete({ phone_number_id: params.phone_number_id });
    //     return res.status(result.status).json(result.data);
    // }

    // // TODO: Adicionar validação
    // @Post('/temperature-analysis/lead-qualification/:phone_number_id')
    // @UseGuards(AdminJwtGuard)
    // async temperatureAnalysisByMessageId(
    //     @Res() res: Response,
    //     @Req() req: Request & { admin_id: number },
    //     @Param() params: { phone_number_id: string },
    // ) {
    //     const result = await this.leadService.temperatureAnalysisByMessageId({ phone_number_id: params.phone_number_id });
    //     return res.status(result.status).json(result.data);
    // }
}
