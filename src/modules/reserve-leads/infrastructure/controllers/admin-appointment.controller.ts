import {
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { GetTenantId } from '../../../../shared/decorators/get-tenant-id.decorator';
import { EAdminRole } from '../../../reserve-auth/domain/enums/admin-role.enum';
import { ListAppointmentsUseCase } from '../../application/use-cases/list-appointments.use-case';
import { GetAppointmentUseCase } from '../../application/use-cases/get-appointment.use-case';
import { CancelAppointmentUseCase } from '../../application/use-cases/cancel-appointment.use-case';
import { CompleteAppointmentUseCase } from '../../application/use-cases/complete-appointment.use-case';
import { ListAppointmentsQueryDto } from '../../application/dtos/list-appointments-query.dto';
import { AppointmentNotFoundError } from '../../domain/errors/appointment-not-found.error';
import { AppointmentAlreadyCancelledError } from '../../domain/errors/appointment-already-cancelled.error';
import { successResponse } from '../../../../shared/helpers/response.helper';

@ApiTags('Admin - Appointments')
@ApiBearerAuth()
@Controller('admin/appointments')
@UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
export class AdminAppointmentController {
  constructor(
    private readonly listAppointmentsUseCase: ListAppointmentsUseCase,
    private readonly getAppointmentUseCase: GetAppointmentUseCase,
    private readonly cancelAppointmentUseCase: CancelAppointmentUseCase,
    private readonly completeAppointmentUseCase: CompleteAppointmentUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('appointments.read')
  @ApiOperation({
    summary: 'List appointments',
    description:
      'Returns a paginated list of appointments ordered by date and time.',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointments retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async list(
    @Query() query: ListAppointmentsQueryDto,
    @GetTenantId() tenantId: string,
  ) {
    const result = await this.listAppointmentsUseCase.execute(
      tenantId,
      query.page,
      query.limit,
      query.status,
    );
    return successResponse(result);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('appointments.read')
  @ApiOperation({
    summary: 'Get appointment details',
    description:
      'Returns appointment details including linked lead information.',
  })
  @ApiParam({
    name: 'id',
    description: 'Appointment ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Appointment not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getOne(@Param('id') id: string, @GetTenantId() tenantId: string) {
    try {
      const appointment = await this.getAppointmentUseCase.execute(
        id,
        tenantId,
      );
      return successResponse(appointment);
    } catch (error) {
      if (error instanceof AppointmentNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('appointments.update')
  @ApiOperation({
    summary: 'Cancel an appointment',
    description:
      'Cancels a confirmed appointment and restores slot capacity.',
  })
  @ApiParam({
    name: 'id',
    description: 'Appointment ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment cancelled successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Appointment not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Appointment is already cancelled',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async cancel(@Param('id') id: string, @GetTenantId() tenantId: string) {
    try {
      const appointment = await this.cancelAppointmentUseCase.execute(
        id,
        tenantId,
      );
      return successResponse(appointment);
    } catch (error) {
      if (error instanceof AppointmentNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof AppointmentAlreadyCancelledError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  @Patch(':id/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('appointments.update')
  @ApiOperation({
    summary: 'Mark appointment as completed',
    description: 'Transitions appointment status to completed.',
  })
  @ApiParam({
    name: 'id',
    description: 'Appointment ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment marked as completed',
  })
  @ApiResponse({
    status: 404,
    description: 'Appointment not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Cannot complete a cancelled appointment',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async complete(@Param('id') id: string, @GetTenantId() tenantId: string) {
    try {
      const appointment = await this.completeAppointmentUseCase.execute(
        id,
        tenantId,
      );
      return successResponse(appointment);
    } catch (error) {
      if (error instanceof AppointmentNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof AppointmentAlreadyCancelledError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
