import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';

export interface ISendTemplateResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * WhatsApp Cloud API template sends (Fase 6 Task 3).
 *
 * Standalone and independent of the existing `whatsapp.provider.ts` —
 * that file (despite the plan's description of it as "currently
 * pre-arrival/post-stay template sends") is, on `main` today, a full stub
 * (`// TODO: Wire up Z-API or WhatsApp Business API`, logs and returns a
 * fake `stub_${Date.now()}` id, no Cloud API credentials plumbed anywhere
 * in `.env.example`). This provider is a real, from-scratch Graph API
 * client rather than an extension of that stub, so it doesn't inherit its
 * TODO.
 *
 * `templateName` is intentionally NOT hardcoded: the actual approved
 * template name/parameter order is a Meta Business Manager artifact this
 * repo cannot define — it must be created and approved in Meta's template
 * review process before `WHATSAPP_DIGEST_TEMPLATE_NAME` has a real value.
 * `sendDigestNotification` reads it from the environment so the code ships
 * correctly regardless of when the template gets approved.
 *
 * Wired into `DigestService.publish()` alongside the existing email
 * `notificationEventService.dispatch` call, gated on the per-tenant
 * `whatsapp_enabled` opt-in flag on `TenantNotificationSettings` (see
 * `notification-settings.service.ts`).
 */
@Injectable()
export class WhatsAppCloudApiProvider {
  private readonly logger = new Logger(WhatsAppCloudApiProvider.name);

  /**
   * Sends an approved WhatsApp template message via the Cloud API.
   * `params` are interpolated positionally into the template's body
   * variables ({{1}}, {{2}}, ...), matching Meta's template component shape.
   */
  async sendTemplate(
    phone: string,
    templateName: string,
    params: string[] = [],
  ): Promise<ISendTemplateResult> {
    const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_CLOUD_API_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
      const error = 'WhatsApp Cloud API is not configured (WHATSAPP_CLOUD_API_TOKEN / WHATSAPP_CLOUD_API_PHONE_NUMBER_ID).';
      this.logger.warn(error);
      return { success: false, error };
    }

    try {
      const { data } = await axios.post(
        `${GRAPH_API_BASE}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'pt_BR' },
            components:
              params.length > 0
                ? [
                    {
                      type: 'body',
                      parameters: params.map((text) => ({ type: 'text', text })),
                    },
                  ]
                : [],
          },
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const messageId = data?.messages?.[0]?.id;
      return { success: true, messageId };
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? JSON.stringify(error.response?.data ?? error.message)
        : error instanceof Error
          ? error.message
          : String(error);
      this.logger.error(`WhatsApp Cloud API template send failed for ${phone}: ${message}`);
      return { success: false, error: message };
    }
  }

  /**
   * Digest-summary template send. Template name is configurable via env
   * so this compiles and ships correctly before the template is approved
   * in Meta Business Manager — see the class doc comment.
   */
  async sendDigestNotification(phone: string, params: string[]): Promise<ISendTemplateResult> {
    const templateName = process.env.WHATSAPP_DIGEST_TEMPLATE_NAME;
    if (!templateName) {
      const error = 'WHATSAPP_DIGEST_TEMPLATE_NAME is not configured — the digest template has not been approved yet.';
      this.logger.warn(error);
      return { success: false, error };
    }
    return this.sendTemplate(phone, templateName, params);
  }
}
