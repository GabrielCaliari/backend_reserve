export class AppointmentAlreadyCancelledError extends Error {
  constructor(appointmentId: string) {
    super(`Appointment ${appointmentId} is already cancelled`);
    this.name = 'AppointmentAlreadyCancelledError';
  }
}
