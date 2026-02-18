import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../../../shared/auth/guards';
import { LeadService } from '../../application/services/lead.service';
import { Response } from 'express';
import { CreateLead, LeadQuery } from '../../application/dtos/lead.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('Lead Management')
@Controller()
export class LeadController {
    constructor(
        private leadService: LeadService
    ) { }

    @Get('/')
    // @UseGuards(AdminJwtGuard)
    @ApiOperation({ summary: 'List leads', description: 'Returns a paginated list of leads' })
    @ApiResponse({ status: 200, description: 'Paginated lead list' })
    @ApiResponse({ status: 500, description: 'Failed to fetch leads' })
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
    // @UseGuards(AdminJwtGuard)
    @ApiOperation({ summary: 'Create lead', description: 'Creates a new lead in the system' })
    @ApiResponse({ status: 201, description: 'Lead created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid data' })
    @ApiResponse({ status: 500, description: 'Failed to create lead' })
    async createLead(
        @Res() res: Response,
        @Body() data: CreateLead
    ) {
        const response = await this.leadService.createLead(data);
        return res.status(response.status).json(response.data);
    }
}
