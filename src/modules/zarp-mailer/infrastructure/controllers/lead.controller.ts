import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '@/shared/auth/guards';
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
    @ApiOperation({ summary: 'Listar leads', description: 'Retorna uma lista paginada de leads' })
    @ApiResponse({ status: 200, description: 'Lista de leads com paginação' })
    @ApiResponse({ status: 500, description: 'Erro ao buscar leads' })
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
    @ApiOperation({ summary: 'Criar lead', description: 'Cria um novo lead no sistema' })
    @ApiResponse({ status: 201, description: 'Lead criado com sucesso' })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    @ApiResponse({ status: 500, description: 'Erro ao criar lead' })
    async createLead(
        @Res() res: Response,
        @Body() data: CreateLead
    ) {
        const response = await this.leadService.createLead(data);
        return res.status(response.status).json(response.data);
    }
}
