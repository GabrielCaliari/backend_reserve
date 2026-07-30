import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { RequiresModule } from '../../../../shared/auth/decorators/requires-module.decorator';
import { GetTenantId } from '../../../../shared/decorators/get-tenant-id.decorator';
import { EAdminRole } from '../../../reserve-auth/domain/enums/admin-role.enum';
import { CreateBlockedPeriodUseCase } from '../../application/use-cases/create-blocked-period.use-case';
import { ListBlockedPeriodsUseCase } from '../../application/use-cases/list-blocked-periods.use-case';
import { DeleteBlockedPeriodUseCase } from '../../application/use-cases/delete-blocked-period.use-case';
import { UpdateBlockedPeriodUseCase } from '../../application/use-cases/update-blocked-period.use-case';
import { CreateBlockedPeriodDto } from '../../application/dtos/create-blocked-period.dto';
import { UpdateBlockedPeriodDto } from '../../application/dtos/update-blocked-period.dto';
import { InvalidTimeRangeError } from '../../domain/errors/invalid-time-range.error';
import { BlockedPeriodNotFoundError } from '../../domain/errors/blocked-period-not-found.error';
import { successResponse } from '../../../../shared/helpers/response.helper';

@ApiTags('Admin - Appointment Blocked Periods')
@ApiBearerAuth()
@Controller('admin/appointments/blocked-periods')
@UseGuards(AdminJwtGuard, TenantGuard, ModuleAccessGuard, PermissionsGuard)
@RequiresModule('leads')
export class AdminBlockedPeriodController {
  constructor(
    private readonly createBlockedPeriodUseCase: CreateBlockedPeriodUseCase,
    private readonly listBlockedPeriodsUseCase: ListBlockedPeriodsUseCase,
    private readonly deleteBlockedPeriodUseCase: DeleteBlockedPeriodUseCase,
    private readonly updateBlockedPeriodUseCase: UpdateBlockedPeriodUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('appointments.blocked-period.read')
  @ApiOperation({
    summary: 'List blocked periods',
    description:
      'Returns a paginated list of blocked periods ordered by start datetime.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Blocked periods retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async list(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @GetTenantId() tenantId: string,
  ) {
    const result = await this.listBlockedPeriodsUseCase.execute(
      tenantId,
      Number(page),
      Number(limit),
    );
    return successResponse(result);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('appointments.blocked-period.create')
  @ApiOperation({
    summary: 'Create a blocked period',
    description:
      'Creates a new blocked period to prevent appointments during the specified time range.',
  })
  @ApiHeader({
    name: 'x-tenant-id',
    description: 'Tenant ID',
    required: true,
  })
  @ApiResponse({
    status: 201,
    description: 'Blocked period created successfully',
  })
  @ApiResponse({
    status: 422,
    description: 'Validation error (end must be after start)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async create(
    @Body() dto: CreateBlockedPeriodDto,
    @GetTenantId() tenantId: string,
  ) {
    try {
      const period = await this.createBlockedPeriodUseCase.execute(
        tenantId,
        dto,
      );
      return successResponse(period);
    } catch (error) {
      if (error instanceof InvalidTimeRangeError) {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('appointments.blocked-period.update')
  @ApiOperation({
    summary: 'Update a blocked period',
    description: 'Updates one or more fields of an existing blocked period.',
  })
  @ApiParam({ name: 'id', description: 'Blocked period ID' })
  @ApiResponse({ status: 200, description: 'Blocked period updated successfully' })
  @ApiResponse({ status: 404, description: 'Blocked period not found' })
  @ApiResponse({ status: 422, description: 'Validation error (end must be after start)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBlockedPeriodDto,
    @GetTenantId() tenantId: string,
  ) {
    try {
      const period = await this.updateBlockedPeriodUseCase.execute(id, tenantId, dto);
      return successResponse(period);
    } catch (error) {
      if (error instanceof BlockedPeriodNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof InvalidTimeRangeError) {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('appointments.blocked-period.delete')
  @ApiOperation({
    summary: 'Delete a blocked period',
    description: 'Deletes a blocked period, restoring slot availability.',
  })
  @ApiParam({
    name: 'id',
    description: 'Blocked period ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Blocked period deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Blocked period not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async delete(@Param('id') id: string, @GetTenantId() tenantId: string) {
    try {
      await this.deleteBlockedPeriodUseCase.execute(id, tenantId);
      return successResponse({ message: 'Blocked period deleted successfully' });
    } catch (error) {
      if (error instanceof BlockedPeriodNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
