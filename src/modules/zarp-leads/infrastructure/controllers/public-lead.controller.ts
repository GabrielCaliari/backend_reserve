import { Body, Controller, HttpCode, HttpStatus, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SubmitLeadUseCase } from '../../application/use-cases/submit-lead.use-case';
import { UpdateLeadUseCase, UpdateLeadDto } from '../../application/use-cases/update-lead.use-case';
import { SubmitLeadDto } from '../../application/dtos/submit-lead.dto';
import { TenantKeyGuard } from '../guards/tenant-key.guard';
import { successResponse } from '../../../../shared/helpers/response.helper';

@ApiTags('Public Lead Submission')
@Controller()
@UseGuards(TenantKeyGuard)
@ApiHeader({
  name: 'X-Tenant-Key',
  description: 'Tenant-specific secret key for authentication',
  required: true,
  schema: { type: 'string', example: 'your-secret-key-here' },
})
export class PublicLeadController {
  constructor(
    private readonly submitLeadUseCase: SubmitLeadUseCase,
    private readonly updateLeadUseCase: UpdateLeadUseCase,
  ) {}

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit a lead',
    description: 'Public endpoint for external lead submission. Does not require JWT authentication. Authenticate using X-Tenant-Key header.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lead submitted successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            leadId: { 
              type: 'string', 
              format: 'uuid', 
              example: '550e8400-e29b-41d4-a716-446655440000' 
            },
          },
        },
        status: { type: 'number', example: 200 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { 
          type: 'array', 
          items: { type: 'string' }, 
          example: ['email must be a valid email', 'name should not be empty'] 
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid tenant key' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Service temporarily unavailable' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async submit(
    @Body() dto: SubmitLeadDto,
    @Req() request: any,
  ) {
    const tenantContext = request.tenantContext;
    const result = await this.submitLeadUseCase.execute(dto, tenantContext);
    
    return successResponse({ leadId: result.leadId });
  }

  @Patch(':leadId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update an existing lead',
    description: 'Updates lead data such as message, source, and custom data fields. Requires the same X-Tenant-Key used during submission.',
  })
  @ApiParam({ name: 'leadId', type: String, description: 'Lead ID returned from POST /submit' })
  @ApiResponse({ status: 200, description: 'Lead updated successfully', schema: { example: { success: true } } })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  @ApiResponse({ status: 401, description: 'Authentication error' })
  async update(
    @Param('leadId') leadId: string,
    @Body() dto: UpdateLeadDto,
    @Req() request: any,
  ) {
    const { tenantId } = request.tenantContext;
    const result = await this.updateLeadUseCase.execute(leadId, dto, tenantId);

    if (!result) {
      throw new NotFoundException('Lead not found');
    }

    return successResponse(result);
  }
}
