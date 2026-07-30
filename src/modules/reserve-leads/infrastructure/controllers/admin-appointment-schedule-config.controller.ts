import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Put,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
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
import { UpsertScheduleConfigUseCase } from '../../application/use-cases/upsert-schedule-config.use-case';
import { GetScheduleConfigUseCase } from '../../application/use-cases/get-schedule-config.use-case';
import { UpsertScheduleConfigDto } from '../../application/dtos/upsert-schedule-config.dto';
import { InvalidTimeRangeError } from '../../domain/errors/invalid-time-range.error';
import { ScheduleConfigNotFoundError } from '../../domain/errors/schedule-config-not-found.error';
import { successResponse } from '../../../../shared/helpers/response.helper';

@ApiTags('Admin - Appointment Schedule Configuration')
@ApiBearerAuth()
@Controller('admin/appointments/schedule-config')
@UseGuards(AdminJwtGuard, TenantGuard, ModuleAccessGuard, PermissionsGuard)
@RequiresModule('leads')
export class AdminAppointmentScheduleConfigController {
  constructor(
    private readonly upsertScheduleConfigUseCase: UpsertScheduleConfigUseCase,
    private readonly getScheduleConfigUseCase: GetScheduleConfigUseCase,
  ) {}

  @Put()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('appointments.schedule-config.manage')
  @ApiOperation({
    summary: 'Create or update appointment schedule configuration',
    description:
      'Upserts the schedule configuration for the tenant. Only one configuration per tenant is allowed.',
  })
  @ApiResponse({
    status: 200,
    description: 'Schedule configuration saved successfully',
  })
  @ApiResponse({
    status: 422,
    description: 'Validation error (business rule violation)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient role',
  })
  async upsert(
    @Body() dto: UpsertScheduleConfigDto,
    @GetTenantId() tenantId: string,
  ) {
    try {
      const config = await this.upsertScheduleConfigUseCase.execute(
        tenantId,
        dto,
      );
      return successResponse(config);
    } catch (error) {
      if (error instanceof InvalidTimeRangeError) {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('appointments.schedule-config.read')
  @ApiOperation({
    summary: 'Get appointment schedule configuration',
    description: 'Retrieves the current schedule configuration for the tenant.',
  })
  @ApiResponse({
    status: 200,
    description: 'Schedule configuration retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Schedule configuration not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async get(@GetTenantId() tenantId: string) {
    try {
      const config = await this.getScheduleConfigUseCase.execute(tenantId);
      return successResponse(config);
    } catch (error) {
      if (error instanceof ScheduleConfigNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
