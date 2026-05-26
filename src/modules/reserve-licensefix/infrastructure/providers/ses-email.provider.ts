import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface ISendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class SesEmailProvider {
  private readonly logger = new Logger(SesEmailProvider.name);
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'email-smtp.us-east-1.amazonaws.com',
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async send(options: ISendEmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM ?? `"LicenseFix" <noreply@licensefix.com.br>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);
      throw error;
    }
  }
}
