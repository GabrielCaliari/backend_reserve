export class BlockedPeriodNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Blocked period not found: ${identifier}`);
    this.name = 'BlockedPeriodNotFoundError';
  }
}
