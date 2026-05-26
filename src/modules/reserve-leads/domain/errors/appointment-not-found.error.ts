export class AppointmentNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Appointment not found: ${identifier}`);
    this.name = 'AppointmentNotFoundError';
  }
}
