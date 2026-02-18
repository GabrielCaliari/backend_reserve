import { Controller, Post, Param, Body, HttpCode, HttpStatus, BadRequestException, NotFoundException, ForbiddenException, GoneException, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiHeader } from '@nestjs/swagger';
import { LeadCollectionService } from '../../application/services/lead-collection.service';
import { LeadService } from '../../application/services/lead.service';
import { CreateLeadDto } from '../../application/dtos/lead.dto';
import * as crypto from 'crypto';

@ApiTags('Lead Capture')
@Controller('collect')
export class LeadCaptureController {
  constructor(
    private readonly collectionService: LeadCollectionService,
    private readonly leadService: LeadService,
  ) {}

  @Post(':slug')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Submit a lead to a collection',
    description: 'Capture endpoint that accepts leads based on collection access mode (public, private/CORS, restricted/auth)'
  })
  @ApiParam({ name: 'slug', description: 'Collection slug', example: 'landing-home' })
  @ApiHeader({ name: 'x-collection-key', required: false, description: 'Secret key (required for restricted collections)' })
  @ApiResponse({ status: 201, description: 'Lead created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Invalid or missing collection key' })
  @ApiResponse({ status: 403, description: 'Origin not allowed' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  @ApiResponse({ status: 410, description: 'Collection is not accepting leads' })
  async captureLead(
    @Param('slug') slug: string,
    @Body() dto: CreateLeadDto,
    @Req() request: any,
  ): Promise<{ success: boolean; data: { id: number } }> {
    // Validate that at least one of name, email, or phone_number is provided
    if (!dto.name && !dto.email && !dto.phone_number) {
      throw new BadRequestException('At least one of name, email, or phone_number is required');
    }

    // Find collection by slug
    const collection = await this.collectionService.findBySlug(slug);
    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    // Check if collection is active
    if (!collection.isActive()) {
      throw new GoneException('Collection is not accepting leads');
    }

    // Enforce access mode
    if (collection.isPrivate()) {
      // CORS enforcement: validate Origin header against allowed_domains
      const origin = request.headers['origin'];
      if (!origin || !collection.allowedDomains.includes(origin)) {
        throw new ForbiddenException('Origin not allowed for this collection');
      }
    } else if (collection.isRestricted()) {
      // Auth enforcement: validate x-collection-key header
      const secretKey = request.headers['x-collection-key'];
      if (!secretKey) {
        throw new BadRequestException('Missing x-collection-key header');
      }
      
      // Validate the secret key by hashing and comparing
      await this.validateSecretKey(secretKey, collection.id!);
    }

    // Create lead with collection context
    const result = await this.leadService.createCollectionLead(dto, {
      id: collection.id!,
      tenantId: collection.tenantId,
    });

    // The service returns { data, status } format
    if (result.status !== 200) {
      throw new BadRequestException(result.data);
    }

    return {
      success: true,
      data: { id: (result.data as any).id },
    };
  }

  private async validateSecretKey(key: string, collectionId: number): Promise<void> {
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    
    // Find collection by secret key hash
    const collection = await this.collectionService.findBySecretKey(hash);
    
    if (!collection || collection.id !== collectionId) {
      throw new BadRequestException('Invalid collection key');
    }
  }
}
