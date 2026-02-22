import { Controller, Post, Param, Body, HttpCode, HttpStatus, NotFoundException, GoneException, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiHeader } from '@nestjs/swagger';
import { LeadService } from '../../application/services/lead.service';
import { CreateLeadDto } from '../../application/dtos/lead.dto';
import { CollectionSecretKeyGuard } from '../guards/collection-secret-key.guard';

@ApiTags('Lead Capture')
@Controller('collect')
@UseGuards(CollectionSecretKeyGuard)
@ApiHeader({
  name: 'x-collection-secret-key',
  description: 'Collection secret key for authentication',
  required: true,
})
export class LeadCaptureController {
  constructor(
    private readonly leadService: LeadService,
  ) {}

  @Post(':slug')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Submit a lead to a collection',
    description: 'Public endpoint to capture leads. Requires x-collection-secret-key header for authentication. Automatically captures IP address and user-agent for analytics.'
  })
  @ApiParam({ name: 'slug', description: 'Collection slug', example: 'landing-home' })
  @ApiResponse({ status: 201, description: 'Lead created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error - at least one of name, email, or phone_number is required' })
  @ApiResponse({ status: 401, description: 'Missing or invalid x-collection-secret-key header' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  @ApiResponse({ status: 410, description: 'Collection is not accepting leads' })
  async captureLead(
    @Param('slug') slug: string,
    @Body() dto: CreateLeadDto,
    @Req() request: any,
  ): Promise<{ success: boolean; data: { id: string } }> {
    // Validate that at least one of name, email, or phone_number is provided
    if (!dto.name && !dto.email && !dto.phone_number) {
      throw new NotFoundException('At least one of name, email, or phone_number is required');
    }

    // Get collection from request (set by CollectionSecretKeyGuard)
    const collection = request.collection;
    
    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    // Check if collection slug matches
    if (collection.slug !== slug) {
      throw new NotFoundException('Collection not found');
    }

    // Check if collection is active
    if (!collection.active) {
      throw new GoneException('Collection is not accepting leads');
    }

    // Extract IP address and user-agent from request
    const ipAddress = this.extractIpAddress(request);
    const userAgent = request.headers['user-agent'] || null;

    // Create lead with collection context and tracking data
    const result = await this.leadService.createCollectionLead(dto, {
      id: collection.id,
      tenantId: collection.tenantId,
      ipAddress,
      userAgent,
    });

    // The service returns { data, status } format
    if (result.status !== 200) {
      throw new NotFoundException(result.data);
    }

    return {
      success: true,
      data: { id: (result.data as any).id },
    };
  }

  private extractIpAddress(request: any): string | null {
    // Try to get real IP from common proxy headers
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      // x-forwarded-for can contain multiple IPs, get the first one
      return forwarded.split(',')[0].trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return realIp;
    }

    // Fallback to connection remote address
    return request.connection?.remoteAddress || 
           request.socket?.remoteAddress || 
           request.ip || 
           null;
  }
}
