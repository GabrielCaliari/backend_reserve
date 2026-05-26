export class InvalidTimeRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTimeRangeError';
  }
}
