import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AdminValidateJwtTokenGuard } from 'src/common/guards/admin-validate-jwt-token/admin-validate-jwt-token.guard';
import { LeadService } from './lead.service';
import { Response } from 'express';
import { CreateLead, LeadQuery } from './lead.dto';

@Controller()
export class LeadController {
    constructor(
        private leadService: LeadService
    ) { }

    @Get('/')
    @UseGuards(AdminValidateJwtTokenGuard)
    async findLead(
        @Res() res: Response,
        @Query() query: LeadQuery
    ) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 30;

        const response = await this.leadService.findLeads({ page, limit });
        return res.status(response.status).json(response.data);
    }

    @Post('/')
    @UseGuards(AdminValidateJwtTokenGuard)
    async createLead(
        @Res() res: Response,
        @Body() data: CreateLead
    ) {
        const response = await this.leadService.createLead(data);
        return res.status(response.status).json(response.data);
    }
}
