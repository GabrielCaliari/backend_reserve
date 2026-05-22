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
export class ForgotPasswordUseCase {
  private readonly logger = new Logger(ForgotPasswordUseCase.name);

  constructor(
    @Inject(ACTIVATION_TOKEN_REPOSITORY)
    private readonly tokenRepo: IActivationTokenRepository,
    private readonly prisma: PrismaService,
    private readonly emailProvider: SesEmailProvider,
  ) {}

  /**
   * Lookup is tenant-scoped: finds Customer by (email, tenant_id).
   * Always returns success to prevent email/tenant enumeration.
   * Invalidates any previous pending reset token before issuing a new one.
   */
  async execute(email: string, tenantId: string): Promise<void> {
    const customer = await this.prisma.customer.findUnique({
      where: { tenant_id_email: { tenant_id: tenantId, email } },
      select: { id: true, name: true },
    });

    if (!customer) {
      this.logger.warn(`Forgot password: no customer for email=${email} tenant=${tenantId}`);
      return;
    }

    // Invalidate previous pending reset token
    const existing = await this.tokenRepo.findActivePending(customer.id, tenantId, ETokenType.PASSWORD_RESET);
    if (existing) {
      this.logger.log(`Invalidating previous reset token ${existing.id} for customer ${customer.id}`);
      await this.tokenRepo.markAsUsed(existing.id);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await this.tokenRepo.create({
      customer_id: customer.id,
      tenant_id: tenantId,
      token: rawToken,
      type: ETokenType.PASSWORD_RESET,
      expires_at: expiresAt,
    });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { domain: true },
    });
    const portalUrl = tenant?.domain ? `https://${tenant.domain}` : 'http://localhost:3000';
    const resetUrl = `${portalUrl}/reset-password?token=${rawToken}`;

    await this.emailProvider.send({
      to: email,
      subject: 'Reset your password — LicenseFix',
      html: this.buildResetEmail(customer.name, resetUrl),
    });

    this.logger.log(`Reset password email sent: customer=${customer.id}, tenant=${tenantId}`);
  }

  private buildResetEmail(name: string, url: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#0070f3;padding:32px 40px;">
          <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">LicenseFix</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="color:#111827;margin:0 0 16px;font-size:20px;">Reset your password</h2>
          <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">Hi, <strong>${name}</strong>.</p>
          <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 32px;">
            We received a request to reset your LicenseFix password. Click the button below to choose a new one:
          </p>
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="border-radius:6px;background:#0070f3;">
              <a href="${url}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
                Reset my password
              </a>
            </td>
          </tr></table>
          <p style="color:#6b7280;font-size:13px;margin:32px 0 0;">This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">
            If the button does not work, copy and paste the link below into your browser:<br>
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
