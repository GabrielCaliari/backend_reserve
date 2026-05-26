import { Inject, Injectable } from '@nestjs/common';
import { AppointmentBlockedPeriod } from '../../domain/entities/appointment-blocked-period.entity';
import { BlockedPeriodNotFoundError } from '../../domain/errors/blocked-period-not-found.error';
import {
  APPOINTMENT_BLOCKED_PERIOD_REPOSITORY,
  IAppointmentBlockedPeriodRepository,
} from '../../domain/interfaces/appointment-blocked-period.repository.interface';
import { UpdateBlockedPeriodDto } from '../dtos/update-blocked-period.dto';

@Injectable()
export class UpdateBlockedPeriodUseCase {
  constructor(
    @Inject(APPOINTMENT_BLOCKED_PERIOD_REPOSITORY)
    private readonly blockedPeriodRepository: IAppointmentBlockedPeriodRepository,
  ) {}

  async execute(
    id: string,
    tenantId: string,
    dto: UpdateBlockedPeriodDto,
  ): Promise<AppointmentBlockedPeriod> {
    // Find existing period (validates tenant ownership)
    const existing = await this.blockedPeriodRepository.findById(id, tenantId);
    if (!existing) {
      throw new BlockedPeriodNotFoundError(id);
    }

    // Merge with existing values — only update what was sent
    const updatedPeriod = new AppointmentBlockedPeriod({
      id: existing.id,
      tenantId: existing.tenantId,
      scheduleConfigId: existing.scheduleConfigId,
      startDatetime: dto.startDatetime ? new Date(dto.startDatetime) : existing.startDatetime,
      endDatetime: dto.endDatetime ? new Date(dto.endDatetime) : existing.endDatetime,
      label: 'label' in dto ? dto.label : existing.label,
    });

    return await this.blockedPeriodRepository.update(updatedPeriod);
  }
}
