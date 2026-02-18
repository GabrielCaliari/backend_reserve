import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LeadCollectionService } from '../../application/services/lead-collection.service';
import { LeadService } from '../../application/services/lead.service';
import { CreateCollectionDto } from '../../application/dtos/create-collection.dto';
import { UpdateCollectionDto } from '../../application/dtos/update-collection.dto';
import { CollectionQueryDto } from '../../application/dtos/collection-query.dto';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { EAdminRole } from '../../../zarp-auth/domain/enums/admin-role.enum';
import { GetTenantId } from '../../../../shared/decorators/get-tenant-id.decorator';
import { successResponse } from '../../../../shared/helpers/response.helper';

@ApiTags('Lead Collections')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
@Controller('leads/collections')
export class LeadCollectionController {
  constructor(
    private readonly service: LeadCollectionService,
    private readonly leadService: LeadService,
  ) {}

  @Post()
  @Roles(EAdminRole.manager, EAdminRole.owner, EAdminRole.super_admin)
  @ApiOperation({ 
    summary: 'Create a new lead collection',
    description: 'Creates a new lead collection for the authenticated tenant. A unique slug is auto-generated from the name. If access mode is "restricted", a secret key is generated and returned (only shown once).'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Collection created successfully. Returns collection data with optional secretKey if access mode is restricted.',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          name: 'Landing Page Home',
          slug: 'landing-page-home',
          source: 'website-main',
          accessMode: 'public',
          allowedDomains: [],
          active: true,
          tenantId: 1,
          createdAt: '2026-02-16T10:00:00Z',
          updatedAt: '2026-02-16T10:00:00Z'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Validation error or slug conflict' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient role (requires manager+)' })
  async create(@Body() dto: CreateCollectionDto, @GetTenantId() tenantId: number) {
    const result = await this.service.createCollection(dto, tenantId);
    return successResponse(result);
  }

  @Get()
  @Roles(EAdminRole.viewer, EAdminRole.editor, EAdminRole.manager, EAdminRole.owner, EAdminRole.super_admin)
  @ApiOperation({ 
    summary: 'List all collections for the tenant',
    description: 'Returns paginated list of collections. Tenant admins see only their tenant\'s collections. Super admins see all collections across all tenants.'
  })
  @ApiResponse({
    status: 200,
    description: 'Collections listed successfully',
    schema: {
      example: {
        success: true,
        data: {
          collections: [
            {
              id: 1,
              name: 'Landing Page Home',
              slug: 'landing-page-home',
              source: 'website-main',
              accessMode: 'public',
              allowedDomains: [],
              active: true,
              tenantId: 1,
              leadCount: 42
            }
          ],
          meta: {
            total: 1,
            page: 1,
            limit: 10
          }
        }
      }
    }
  })
  async findAll(@Query() query: CollectionQueryDto, @GetTenantId() tenantId: number) {
    const { data, meta } = await this.service.findCollections(query, tenantId);
    return successResponse({ collections: data, meta });
  }

  @Get(':id')
  @Roles(EAdminRole.viewer, EAdminRole.editor, EAdminRole.manager, EAdminRole.owner, EAdminRole.super_admin)
  @ApiOperation({ 
    summary: 'Get a collection by ID',
    description: 'Returns detailed information about a specific collection. Enforces tenant isolation unless user is super admin.'
  })
  @ApiResponse({ status: 200, description: 'Collection found' })
  @ApiResponse({ status: 404, description: 'Collection not found or does not belong to tenant' })
  async findOne(@Param('id', ParseIntPipe) id: number, @GetTenantId() tenantId: number) {
    const result = await this.service.findCollectionById(id, tenantId);
    return successResponse(result);
  }

  @Put(':id')
  @Roles(EAdminRole.manager, EAdminRole.owner, EAdminRole.super_admin)
  @ApiOperation({ 
    summary: 'Update a collection',
    description: 'Updates collection metadata and access mode. When changing to "restricted" mode, a new secret key is generated and returned. When changing from "restricted" to another mode, the key is cleared.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Collection updated successfully. Returns secretKey if access mode changed to restricted.',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          name: 'Landing Page Home',
          slug: 'landing-page-home',
          source: 'website-main',
          accessMode: 'restricted',
          allowedDomains: [],
          active: true,
          tenantId: 1,
          secretKey: 'ck_live_abc123...' // Only returned when switching to restricted mode
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCollectionDto,
    @GetTenantId() tenantId: number,
  ) {
    const result = await this.service.updateCollection(id, dto, tenantId);
    return successResponse(result);
  }
  
  @Post(':id/regenerate-key')
  @Roles(EAdminRole.manager, EAdminRole.owner, EAdminRole.super_admin)
  @ApiOperation({ 
    summary: 'Regenerate secret key for a restricted collection',
    description: 'Generates a new secret key for a collection in "restricted" mode. The old key is immediately invalidated. The new key is returned only once and should be stored securely.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Secret key regenerated successfully',
    schema: {
      example: {
        success: true,
        data: {
          secretKey: 'ck_live_new_key_abc123...'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Collection is not in restricted mode' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async regenerateKey(@Param('id', ParseIntPipe) id: number, @GetTenantId() tenantId: number) {
    const result = await this.service.regenerateKey(id, tenantId);
    return successResponse(result);
  }

  @Delete(':id')
  @Roles(EAdminRole.manager, EAdminRole.owner, EAdminRole.super_admin)
  @ApiOperation({ 
    summary: 'Deactivate a collection',
    description: 'Marks a collection as inactive. The collection stops accepting new leads immediately, but existing leads are preserved. The collection can be reactivated by updating its active status.'
  })
  @ApiResponse({ status: 200, description: 'Collection deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async remove(@Param('id', ParseIntPipe) id: number, @GetTenantId() tenantId: number) {
    const result = await this.service.deactivateCollection(id, tenantId);
    return successResponse(result);
  }

  @Get(':id/leads')
  @Roles(EAdminRole.viewer, EAdminRole.editor, EAdminRole.manager, EAdminRole.owner, EAdminRole.super_admin)
  @ApiOperation({ 
    summary: 'List leads within a specific collection',
    description: 'Returns paginated list of leads captured through this collection. Enforces tenant isolation - admins can only view leads from their tenant\'s collections.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Leads listed successfully',
    schema: {
      example: {
        success: true,
        data: {
          leads: [
            {
              id: 1,
              name: 'John Doe',
              email: 'john@example.com',
              phone_number: '+5511999999999',
              origin: 6,
              status: 1,
              created_at: '2026-02-16T10:00:00Z'
            }
          ],
          page: {
            count: 42,
            count_pages: 2,
            current_page: 1,
            limit: 30
          }
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Collection not found or does not belong to tenant' })
  async getCollectionLeads(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 30,
    @GetTenantId() tenantId: number,
  ) {
    // Verify collection exists and belongs to tenant
    await this.service.findCollectionById(id, tenantId);
    
    // Get leads filtered by collection_id
    const result = await this.leadService.findLeadsByCollection(id, { page, limit });
    return result;
  }
}
