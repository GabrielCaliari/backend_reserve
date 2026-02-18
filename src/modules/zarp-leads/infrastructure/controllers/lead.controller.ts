import { Controller, Get, Post, Put, Body, Param, Query, HttpCode, HttpStatus, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { LeadService } from '../../application/services/lead.service';
import { CreateLeadDto, LeadQueryDto } from '../../application/dtos/lead.dto';
import { ELeadStatus } from '../../domain/entities/lead.entity';
import { AdminJwtGuard } from '../../../../shared/auth/guards';

@ApiTags('Leads')
@Controller()
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  // --- Public endpoint (no authentication required) ---

  @Post('/')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create lead',
    description: 'Creates a new lead entry. This is a public endpoint for lead capture (landing pages, contact forms, etc.)',
  })
  @ApiResponse({ status: 201, description: 'Lead created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async createLead(@Body() dto: CreateLeadDto) {
    return this.leadService.createLead(dto);
  }

  // --- Admin-only endpoints (authentication required) ---

  @Get('/')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List leads',
    description: 'Returns a paginated list of leads. Requires admin authentication.',
  })
  @ApiResponse({ status: 200, description: 'Paginated lead list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findLeads(@Query() query: LeadQueryDto) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 30;

    return this.leadService.findLeads({ page, limit });
  }

  @Get('/:id')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get lead by ID',
    description: 'Returns details of a specific lead. Requires admin authentication.',
  })
  @ApiParam({ name: 'id', description: 'Lead ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Lead details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async findLeadById(@Param('id', ParseIntPipe) id: number) {
    return this.leadService.findLeadById(id);
  }

  @Put('/:id/status')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update lead status',
    description: 'Updates the status of a lead (e.g. archive). Requires admin authentication.',
  })
  @ApiParam({ name: 'id', description: 'Lead ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Lead status updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async updateLeadStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: ELeadStatus,
  ) {
    return this.leadService.updateLeadStatus(id, status);
  }
}
