import { Controller, Get, Post, Put, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { EmailCampaignService } from '../../application/services';
import {
  CreateEmailCampaignDto,
  EmailCampaignQueryDto,
  UpdateCopyVariantDto,
  UpdateCampaignBatchSizeDto,
} from '../../application/dtos';

@ApiTags('Email Campaign')
@Controller()
export class EmailCampaignController {
  constructor(private readonly emailCampaignService: EmailCampaignService) {}

  @Post('/')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create email campaign',
    description: 'Creates a new email marketing campaign in draft status',
  })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 404, description: 'Default SMTP server not found' })
  async createEmailCampaign(@Body() dto: CreateEmailCampaignDto) {
    return this.emailCampaignService.createEmailCampaign(dto.name);
  }

  @Get('/')
  @ApiOperation({
    summary: 'List campaigns',
    description: 'Returns a paginated list of email campaigns',
  })
  @ApiResponse({ status: 200, description: 'Paginated campaign list' })
  async getAllEmailCampaigns(@Query() query: EmailCampaignQueryDto) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 30;

    return this.emailCampaignService.findEmailCampaigns(page, limit);
  }

  @Get('/:id')
  @ApiOperation({
    summary: 'Get campaign by ID',
    description: 'Returns details of a specific campaign',
  })
  @ApiParam({ name: 'id', description: 'Campaign ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Campaign details' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async getEmailCampaignById(@Param('id') id: string) {
    return this.emailCampaignService.getEmailCampaignById(parseInt(id, 10));
  }

  @Put('/:id/copy-variant')
  @ApiOperation({
    summary: 'Update copy variation type',
    description: 'Updates the copy variation type of a campaign (AI or manual)',
  })
  @ApiParam({ name: 'id', description: 'Campaign ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Copy variation type updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid operation or campaign not in draft' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async updateCopyVariant(@Param('id') id: string, @Body() dto: UpdateCopyVariantDto) {
    return this.emailCampaignService.updateCopyVariationType(
      parseInt(id, 10),
      dto.copy_variation_type,
    );
  }

  @Put('/:id/batch-size')
  @ApiOperation({
    summary: 'Update batch size',
    description: 'Updates the campaign sending batch size (minimum 100)',
  })
  @ApiParam({ name: 'id', description: 'Campaign ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Batch size updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid value or campaign not in draft' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async updateCampaignBatchSize(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignBatchSizeDto,
  ) {
    return this.emailCampaignService.updateCampaignBatchSize(
      parseInt(id, 10),
      dto.campaign_batch_size,
    );
  }

  @Post('/:id/close-setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Close campaign setup',
    description: 'Finalizes the campaign configuration and moves to pending status',
  })
  @ApiParam({ name: 'id', description: 'Campaign ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Setup closed successfully' })
  @ApiResponse({ status: 400, description: 'Campaign is not in draft' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async closeSetup(@Param('id') id: string) {
    return this.emailCampaignService.closeSetup(parseInt(id, 10));
  }

  @Post('/:id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Pause campaign',
    description: 'Pauses a running or scheduled campaign',
  })
  @ApiParam({ name: 'id', description: 'Campaign ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Campaign paused successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status for pausing' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async pauseCampaign(@Param('id') id: string) {
    return this.emailCampaignService.pauseCampaign(parseInt(id, 10));
  }

  @Post('/:id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resume campaign',
    description: 'Resumes a paused campaign',
  })
  @ApiParam({ name: 'id', description: 'Campaign ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Campaign resumed successfully' })
  @ApiResponse({ status: 400, description: 'Campaign is not paused' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async resumeCampaign(@Param('id') id: string) {
    return this.emailCampaignService.resumeCampaign(parseInt(id, 10));
  }
}
