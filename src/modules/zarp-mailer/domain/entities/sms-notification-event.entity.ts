import PhoneNumber from '../../../../shared/domain/value-objects/phone-number.vo';

export enum ESMSNotificationEventStatus {
  pending = 1,
  sent = 2,
  failed = 3,
}

export enum ESMSProvider {
  awsSNS = 1,
}

export default class SMSNotificationEvent {
  public id?: string;
  public message: string;
  public destination_number: PhoneNumber;
  public sender_number: PhoneNumber;
  public destination_country: number;
  public sms_provider: ESMSProvider;
  public payload_provider_response?: Object;
  public payload_message?: Object;
  public status: ESMSNotificationEventStatus;
  public sms_notification_id?: string;
  public sms_notification?: unknown;
  public created_at?: Date;
  public updated_at?: Date;

  constructor(smsNotificationEvent: SMSNotificationEvent) {
    this.id = smsNotificationEvent.id ?? null;
    this.message = smsNotificationEvent.message;
    this.destination_number = smsNotificationEvent.destination_number;
    this.sender_number = smsNotificationEvent.sender_number;
    this.destination_country = smsNotificationEvent.destination_country;
    this.sms_provider = smsNotificationEvent.sms_provider;
    this.payload_provider_response = smsNotificationEvent.payload_provider_response ?? null;
    this.payload_message = smsNotificationEvent.payload_message ?? null;
    this.status = smsNotificationEvent.status;
    this.sms_notification_id = smsNotificationEvent.sms_notification_id ?? null;
    this.sms_notification = smsNotificationEvent.sms_notification ?? null;
    this.created_at = smsNotificationEvent.created_at ?? null;
    this.updated_at = smsNotificationEvent.updated_at ?? null;
  }
}
