export enum EAppointmentStatus {
  confirmed = 'confirmed',
  cancelled = 'cancelled',
  completed = 'completed',
}

export interface LeadData {
  id?: string;
  name?: string;
  email?: string;
  phone_number?: string;
}

export class Appointment {
  public readonly id?: string;
  public readonly tenantId: string;
  public readonly leadId: string;
  public readonly scheduleConfigId: string;
  public readonly appointmentDate: Date;
  public readonly slotStartTime: string;
  public readonly slotEndTime: string;
  public readonly status: EAppointmentStatus;
  public readonly selectedProduct?: string;
  public readonly notes?: string;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;
  public readonly Lead?: LeadData; // Lead relation data

  constructor(appointment: {
    id?: string;
    tenantId: string;
    leadId: string;
    scheduleConfigId: string;
    appointmentDate: Date;
    slotStartTime: string;
    slotEndTime: string;
    status: EAppointmentStatus;
    selectedProduct?: string;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
    Lead?: LeadData;
  }) {
    this.id = appointment.id;
    this.tenantId = appointment.tenantId;
    this.leadId = appointment.leadId;
    this.scheduleConfigId = appointment.scheduleConfigId;
    this.appointmentDate = appointment.appointmentDate;
    this.slotStartTime = appointment.slotStartTime;
    this.slotEndTime = appointment.slotEndTime;
    this.status = appointment.status;
    this.selectedProduct = appointment.selectedProduct;
    this.notes = appointment.notes;
    this.createdAt = appointment.createdAt;
    this.updatedAt = appointment.updatedAt;
    this.Lead = appointment.Lead;
  }
}
