import { InvalidTimeRangeError } from '../errors/invalid-time-range.error';

export class AppointmentBlockedPeriod {
  public readonly id?: string;
  public readonly tenantId: string;
  public readonly scheduleConfigId: string;
  public readonly startDatetime: Date;
  public readonly endDatetime: Date;
  public readonly label?: string;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  constructor(period: {
    id?: string;
    tenantId: string;
    scheduleConfigId: string;
    startDatetime: Date;
    endDatetime: Date;
    label?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    // Validate end > start
    if (period.endDatetime <= period.startDatetime) {
      throw new InvalidTimeRangeError(
        `End datetime (${period.endDatetime.toISOString()}) must be after start datetime (${period.startDatetime.toISOString()})`,
      );
    }

    this.id = period.id;
    this.tenantId = period.tenantId;
    this.scheduleConfigId = period.scheduleConfigId;
    this.startDatetime = period.startDatetime;
    this.endDatetime = period.endDatetime;
    this.label = period.label;
    this.createdAt = period.createdAt;
    this.updatedAt = period.updatedAt;
  }
}
