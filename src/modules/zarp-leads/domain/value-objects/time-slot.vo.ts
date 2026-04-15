export class TimeSlot {
  public readonly startTime: string;
  public readonly endTime: string;
  public readonly date: Date;
  public readonly availableCapacity: number;
  public readonly isAvailable: boolean;

  constructor(
    startTime: string,
    endTime: string,
    date: Date,
    availableCapacity: number = 0,
    isAvailable: boolean = true,
  ) {
    this.startTime = startTime;
    this.endTime = endTime;
    this.date = date;
    this.availableCapacity = availableCapacity;
    this.isAvailable = isAvailable;
  }
}
