export class SlotUnavailableError extends Error {
  constructor(date: Date, time: string) {
    super(`Slot unavailable: no remaining capacity for ${date.toISOString().split('T')[0]} at ${time}`);
    this.name = 'SlotUnavailableError';
  }
}
