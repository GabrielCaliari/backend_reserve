import { Inject, Injectable } from '@nestjs/common';
import { AppointmentBlockedPeriod } from '../../domain/entities/appointment-blocked-period.entity';
import {
  APPOINTMENT_BLOCKED_PERIOD_REPOSITORY,
  IAppointmentBlockedPeriodRepository,
  PaginatedResult,
} from '../../domain/interfaces/appointment-blocked-period.repository.interface';

@Injectable()
export class ListBlockedPeriodsUseCase {
  constructor(
    @Inject(APPOINTMENT_BLOCKED_PERIOD_REPOSITORY)
    private readonly blockedPeriodRepository: IAppointmentBlockedPeriodRepository,
  ) {}

  async execute(
    tenantId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResult<AppointmentBlockedPeriod>> {
    return await this.blockedPeriodRepository.findAllByTenantId(tenantId, {
      page,
      limit,
    });
  }
}
