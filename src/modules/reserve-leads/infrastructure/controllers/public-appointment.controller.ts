import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetSlotAvailabilityUseCase } from '../../application/use-cases/get-slot-availability.use-case';
import { GetSlotAvailabilityQueryDto } from '../../application/dtos/get-slot-availability-query.dto';
import { TenantKeyGuard } from '../guards/tenant-key.guard';
import { successResponse } from '../../../../shared/helpers/response.helper';

@ApiTags('Public Appointments')
@Controller('appointments')
@UseGuards(TenantKeyGuard)
@ApiHeader({
  name: 'X-Tenant-Key',
  description: 'Tenant-specific secret key for authentication',
  required: true,
  schema: { type: 'string', example: 'your-secret-key-here' },
})
export class PublicAppointmentController {
  constructor(
    private readonly getSlotAvailabilityUseCase: GetSlotAvailabilityUseCase,
  ) {}

  @Get('availability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get available appointment slots for a date',
    description:
      'Returns all available time slots for the specified date based on the tenant schedule configuration. Slots are filtered by working hours, lunch breaks, blocked periods, and existing bookings.',
  })
  @ApiResponse({
    status: 200,
    description: 'Available slots retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            slots: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  startTime: { type: 'string', example: '09:00' },
                  endTime: { type: 'string', example: '09:30' },
                  date: { type: 'string', format: 'date-time' },
                  availableCapacity: { type: 'number', example: 2 },
                  isAvailable: { type: 'boolean', example: true },
                },
              },
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
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication error',
  })
  async getAvailability(
    @Query() query: GetSlotAvailabilityQueryDto,
    @Req() request: any,
  ) {
    const { tenantId } = request.tenantContext;
    const slots = await this.getSlotAvailabilityUseCase.execute(
      tenantId,
      query.date,
    );

    return successResponse({ slots });
  }
}
