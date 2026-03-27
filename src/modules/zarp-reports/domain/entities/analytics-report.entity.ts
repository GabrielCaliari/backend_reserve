export class AnalyticsReport {
  id?: string;
  phone: string;
  url: string;
  label?: string;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(data: AnalyticsReport) {
    this.id = data.id;
    this.phone = data.phone;
    this.url = data.url;
    this.label = data.label;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
