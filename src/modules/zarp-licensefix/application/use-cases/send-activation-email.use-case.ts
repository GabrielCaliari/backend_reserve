import { Injectable, Inject, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  IActivationTokenRepository,
  ACTIVATION_TOKEN_REPOSITORY,
} from '../../domain/interfaces/activation-token.repository.interface';
import { ETokenType } from '../../domain/enums/token-type.enum';
import { SesEmailProvider } from '../../infrastructure/providers/ses-email.provider';

@Injectable()
export class SendActivationEmailUseCase {
  private readonly logger = new Logger(SendActivationEmailUseCase.name);

  constructor(
    @Inject(ACTIVATION_TOKEN_REPOSITORY)
    private readonly tokenRepo: IActivationTokenRepository,
    private readonly prisma: PrismaService,
    private readonly emailProvider: SesEmailProvider,
  ) {}

  /**
   * Sends an activation email to a Customer (tenant-scoped).
   * Idempotent:
   *   - skips if CustomerCredential already exists (already activated)
   *   - skips if an unexpired+unused ACTIVATION token already exists for (customer, tenant)
   */
  async execute(customerId: string, customerEmail: string, customerName: string, tenantId: string): Promise<void> {
    // Skip if customer already has a credential (password already set)
    const existingCredential = await this.prisma.customerCredential.findUnique({
      where: { customer_id: customerId },
      select: { id: true },
    });

    if (existingCredential) {
      this.logger.log(`Customer ${customerId} (tenant ${tenantId}) already has credentials — skipping activation email`);
      return;
    }

    // Idempotency: skip if valid pending ACTIVATION token already exists
    const existingToken = await this.tokenRepo.findActivePending(customerId, tenantId, ETokenType.ACTIVATION);
    if (existingToken) {
      this.logger.log(`Active ACTIVATION token already exists for customer ${customerId} / tenant ${tenantId} — skipping`);
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    const tokenRecord = await this.tokenRepo.create({
      customer_id: customerId,
      tenant_id: tenantId,
      token: rawToken,
      type: ETokenType.ACTIVATION,
      expires_at: expiresAt,
    });

    const activationUrl = `${process.env.LICENSEFIX_PORTAL_URL ?? 'https://app.licensefix.com.br'}/activate?token=${rawToken}`;

    await this.emailProvider.send({
      to: customerEmail,
      subject: 'Bem-vindo ao LicenseFix — Crie sua senha de acesso',
      html: this.buildActivationEmail(customerName, activationUrl),
    });

    this.logger.log(`Activation email sent: customer=${customerId}, tenant=${tenantId}, token=${tokenRecord.id}`);
  }

  private buildActivationEmail(name: string, url: string): string {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#0070f3;padding:32px 40px;">
          <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">LicenseFix</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="color:#111827;margin:0 0 16px;font-size:20px;">Sua compra foi confirmada!</h2>
          <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">Olá, <strong>${name}</strong>.</p>
          <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 32px;">
            Obrigado pela sua compra. Para acessar o portal, crie sua senha de acesso clicando no botão abaixo:
          </p>
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="border-radius:6px;background:#0070f3;">
              <a href="${url}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
                Criar minha senha
              </a>
            </td>
          </tr></table>
          <p style="color:#6b7280;font-size:13px;margin:32px 0 0;">Este link é válido por <strong>90 dias</strong>.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">
            Caso o botão não funcione, copie e cole o link abaixo no seu navegador:<br>
            <a href="${url}" style="color:#0070f3;word-break:break-all;">${url}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}
