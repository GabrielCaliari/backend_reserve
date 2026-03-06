import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SubmitLeadUseCase } from '../../application/use-cases/submit-lead.use-case';
import { SubmitLeadDto } from '../../application/dtos/submit-lead.dto';
import { TenantKeyGuard } from '../guards/tenant-key.guard';

@ApiTags('Public Lead Submission')
@Controller('leads')
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
        leadId: { 
          type: 'string', 
          format: 'uuid', 
          example: '550e8400-e29b-41d4-a716-446655440000' 
        },
        message: { 
          type: 'string', 
          example: 'Lead submitted successfully' 
        },
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
  ): Promise<{ leadId: string; message: string }> {
    const tenantContext = request.tenantContext;
    const result = await this.submitLeadUseCase.execute(dto, tenantContext);
    
    return {
      leadId: result.leadId,
      message: 'Lead submitted successfully',
    };
  }
}
