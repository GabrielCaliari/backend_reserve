export class SMSNotification {
  public id?: number;
  public webhook?: string;
  public name: string;
  public total_notifications: number;
  public created_at?: Date;
  public updated_at?: Date;

  constructor(smsNotification: SMSNotification) {
    this.id = smsNotification.id ?? null;
    this.webhook = smsNotification.webhook ?? null;
    this.name = smsNotification.name;
    this.total_notifications = smsNotification.total_notifications;
    this.created_at = smsNotification.created_at ?? null;
    this.updated_at = smsNotification.updated_at ?? null;
  }
}
