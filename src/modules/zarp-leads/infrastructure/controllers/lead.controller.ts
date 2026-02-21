import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { LeadService } from '../../application/services/lead.service';
import { LeadQueryDto } from '../../application/dtos/lead.dto';
import { CreateLeadWithAttachmentsDto } from '../../application/dtos/create-lead-with-attachments.dto';
import { AttachmentDto } from '../../application/dtos/attachment.dto';
import { ELeadStatus } from '../../domain/entities/lead.entity';
import { AdminJwtGuard } from '../../../../shared/auth/guards';
import { CreateLeadWithAttachmentsUseCase } from '../../application/use-cases/create-lead-with-attachments.use-case';
import { AttachFileToLeadUseCase } from '../../application/use-cases/attach-file-to-lead.use-case';
import { RemoveLeadAttachmentUseCase } from '../../application/use-cases/remove-lead-attachment.use-case';
import { ILeadAttachmentRepository, LEAD_ATTACHMENT_REPOSITORY } from '../../domain/interfaces/lead-attachment.repository.interface';
import { Inject, ParseIntPipe } from '@nestjs/common';
import { ParseUUIDPipe } from '../../../../common/pipe/parse-uuid.pipe';

@ApiTags('Leads')
@Controller()
export class LeadController {
  constructor(
    private readonly leadService: LeadService,
    private readonly createLeadWithAttachmentsUseCase: CreateLeadWithAttachmentsUseCase,
    private readonly attachFileToLeadUseCase: AttachFileToLeadUseCase,
    private readonly removeLeadAttachmentUseCase: RemoveLeadAttachmentUseCase,
    @Inject(LEAD_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepository: ILeadAttachmentRepository,
  ) {}

  // --- Public endpoint (no authentication required) ---

  @Post('/')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create lead with optional attachments',
    description: 'Creates a new lead entry with optional file attachments. Public endpoint for lead capture.',
  })
  @ApiResponse({ status: 201, description: 'Lead created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async createLead(@Body() dto: CreateLeadWithAttachmentsDto) {
    return this.createLeadWithAttachmentsUseCase.execute(dto);
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
  @ApiParam({ name: 'id', description: 'Lead UUID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Lead details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async findLeadById(@Param('id', ParseUUIDPipe) id: string) {
    return this.leadService.findLeadById(id);
  }

  @Get('/:id/attachments')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List lead attachments',
    description: 'Returns all file attachments for a lead. Requires admin authentication.',
  })
  @ApiParam({ name: 'id', description: 'Lead UUID', type: 'string' })
  @ApiResponse({ status: 200, description: 'List of attachments' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getLeadAttachments(@Param('id', ParseUUIDPipe) id: string) {
    const attachments = await this.attachmentRepository.findByLeadId(id);
    return { data: attachments };
  }

  @Post('/:id/attachments')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add attachment to lead',
    description: 'Attaches a file to an existing lead. Requires admin authentication.',
  })
  @ApiParam({ name: 'id', description: 'Lead UUID', type: 'string' })
  @ApiResponse({ status: 201, description: 'Attachment added successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async addAttachment(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Body() dto: AttachmentDto,
  ) {
    return this.attachFileToLeadUseCase.execute(leadId, dto.asset_id, dto.label);
  }

  @Delete('/:id/attachments/:attachmentId')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Remove attachment from lead',
    description: 'Removes a file attachment from a lead. Does not delete the file itself. Requires admin authentication.',
  })
  @ApiParam({ name: 'id', description: 'Lead UUID', type: 'string' })
  @ApiParam({ name: 'attachmentId', description: 'Attachment ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Attachment removed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  async removeAttachment(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
  ) {
    return this.removeLeadAttachmentUseCase.execute(attachmentId);
  }

  @Put('/:id/status')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update lead status',
    description: 'Updates the status of a lead (e.g. archive). Requires admin authentication.',
  })
  @ApiParam({ name: 'id', description: 'Lead UUID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Lead status updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async updateLeadStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: ELeadStatus,
  ) {
    return this.leadService.updateLeadStatus(id, status);
  }
}
