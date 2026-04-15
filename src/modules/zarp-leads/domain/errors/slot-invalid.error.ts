export class SlotInvalidError extends Error {
  constructor(date: Date, time: string) {
    super(`The requested time ${time} on ${date.toISOString().split('T')[0]} does not correspond to a valid slot`);
    this.name = 'SlotInvalidError';
  }
}
