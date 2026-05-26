import { Inject, Injectable } from '@nestjs/common';
import { BlockedPeriodNotFoundError } from '../../domain/errors/blocked-period-not-found.error';
import {
  APPOINTMENT_BLOCKED_PERIOD_REPOSITORY,
  IAppointmentBlockedPeriodRepository,
} from '../../domain/interfaces/appointment-blocked-period.repository.interface';

@Injectable()
export class DeleteBlockedPeriodUseCase {
  constructor(
    @Inject(APPOINTMENT_BLOCKED_PERIOD_REPOSITORY)
    private readonly blockedPeriodRepository: IAppointmentBlockedPeriodRepository,
  ) {}

  async execute(id: string, tenantId: string): Promise<void> {
    // Verify ownership (throws if not found or wrong tenant)
    const period = await this.blockedPeriodRepository.findById(id, tenantId);

    if (!period) {
      throw new BlockedPeriodNotFoundError(id);
    }

    await this.blockedPeriodRepository.delete(id);
  }
}
