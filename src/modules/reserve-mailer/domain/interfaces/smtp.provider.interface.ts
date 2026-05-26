/**
 * SMTP Provider interface
 * Infrastructure layer must implement this contract
 */
export interface ISMTPProvider {
  sendEmail(params: {
    to: string;
    from: string;
    fromName: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export const SMTP_PROVIDER = Symbol('SMTP_PROVIDER');
