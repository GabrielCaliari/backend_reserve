import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WhatsAppProvider {
  private readonly logger = new Logger(WhatsAppProvider.name);

  // TODO: Wire up Z-API or WhatsApp Business API
  // Z-API: POST https://api.z-api.io/instances/{instance}/token/{token}/send-text
  // Meta: POST https://graph.facebook.com/v19.0/{phone_number_id}/messages
  async sendTextMessage(phone: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    this.logger.log(`[STUB] WhatsApp to ${phone}: ${message.substring(0, 60)}...`);
    return { success: true, messageId: `stub_${Date.now()}` };
  }

  interpolateTemplate(body: string, variables: Record<string, string>): string {
    return Object.entries(variables).reduce(
      (text, [key, value]) => text.replace(new RegExp(`{{${key}}}`, 'g'), value),
      body,
    );
  }
}
