import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { StatsIntegrationService } from '../../application/services/stats-integration.service';
import {
  CreateStatsIntegrationDto,
  UpdateStatsIntegrationDto,
  StatsIntegrationResponseDto,
  AvailableIntegrationDto,
} from '../../application/dtos/stats-integration.dto';
import { AdminJwtGuard, TenantGuard, RolesGuard } from '../../../../shared/auth/guards';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { EAdminRole } from '../../../reserve-auth/domain/enums/admin-role.enum';

@ApiTags('Stats - Integrations')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID' })
@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
@Controller('/integrations')
export class StatsIntegrationController {
  constructor(private readonly integrationService: StatsIntegrationService) {}

  @Get('/')
  @Roles(EAdminRole.viewer)
  @ApiOperation({
    summary: 'List tenant integrations',
    description: 'Returns all external metric integrations configured for the current tenant.',
  })
  @ApiResponse({ status: 200, description: 'List of integrations', type: [StatsIntegrationResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async list(@Req() req: any): Promise<StatsIntegrationResponseDto[]> {
    return this.integrationService.listByTenant(req.tenant_id);
  }

  @Get('/providers')
  @Roles(EAdminRole.viewer)
  @ApiOperation({
    summary: 'List available providers',
    description: 'Returns all registered external metric providers with config schemas.',
  })
  @ApiResponse({ status: 200, description: 'Available providers', type: [AvailableIntegrationDto] })
  listProviders(): AvailableIntegrationDto[] {
    return this.integrationService.getAvailableProviders();
  }

  @Get('/:id')
  @Roles(EAdminRole.viewer)
  @ApiOperation({ summary: 'Get integration by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Integration details', type: StatsIntegrationResponseDto })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getById(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<StatsIntegrationResponseDto> {
    return this.integrationService.getById(id, req.tenant_id);
  }

  @Post('/')
  @Roles(EAdminRole.manager)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create integration',
    description: 'Creates a new external metric integration for the current tenant. Config is validated against the provider schema.',
  })
  @ApiResponse({ status: 201, description: 'Integration created', type: StatsIntegrationResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid provider key or config' })
  @ApiResponse({ status: 409, description: 'Integration for this key already exists' })
  async create(
    @Req() req: any,
    @Body() dto: CreateStatsIntegrationDto,
  ): Promise<StatsIntegrationResponseDto> {
    return this.integrationService.create(req.tenant_id, dto);
  }

  @Patch('/:id')
  @Roles(EAdminRole.manager)
  @ApiOperation({
    summary: 'Update integration',
    description: 'Updates label, config, or active status of an existing integration.',
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Integration updated', type: StatsIntegrationResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid config' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateStatsIntegrationDto,
  ): Promise<StatsIntegrationResponseDto> {
    return this.integrationService.update(id, req.tenant_id, dto);
  }

  @Delete('/:id')
  @Roles(EAdminRole.manager)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete integration' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 204, description: 'Integration deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async delete(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<void> {
    return this.integrationService.delete(id, req.tenant_id);
  }
}
