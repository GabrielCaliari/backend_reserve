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
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
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
@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
export class AdminAppointmentScheduleConfigController {
  constructor(
    private readonly upsertScheduleConfigUseCase: UpsertScheduleConfigUseCase,
    private readonly getScheduleConfigUseCase: GetScheduleConfigUseCase,
  ) {}

  @Put()
  @HttpCode(HttpStatus.OK)
  @Roles(EAdminRole.editor)
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
  @Roles(EAdminRole.viewer)
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
