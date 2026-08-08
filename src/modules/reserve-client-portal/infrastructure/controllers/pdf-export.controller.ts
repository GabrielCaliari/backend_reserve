import { Controller, Get, Param, Query, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { RequiresModule } from '../../../../shared/auth/decorators/requires-module.decorator';
import { OverviewService } from '../../application/services/overview.service';
import { HotelClientService } from '../../application/services/hotel-client.service';
import { PdfExportProvider } from '../providers/pdf-export.provider';

type ExportSection = 'overview';

const SUPPORTED_SECTIONS: ExportSection[] = ['overview'];

/**
 * Server-side PDF export (Fase 6 Task 1). Reuses the exact same section
 * services (`OverviewService`, and later `RoiAnalysisService`/etc. once
 * they land) the screen itself calls — there is no separate "PDF data"
 * query path, only a different rendering target for the same payload.
 *
 * Route matches the client-portal convention: `hotel-portal/:clientId/...`
 * e por isso roda a mesma cadeia de guards do `ClientPortalController`:
 * AdminJwtGuard -> TenantGuard (resolve o x-tenant-id que o dashboard sempre
 * envia nessas rotas) -> ModuleAccessGuard, que gateia o modulo client-portal.
 */
@Controller('hotel-portal')
@UseGuards(AdminJwtGuard, TenantGuard, ModuleAccessGuard)
@RequiresModule('client-portal')
export class PdfExportController {
  constructor(
    private readonly pdfExportProvider: PdfExportProvider,
    private readonly overviewService: OverviewService,
    private readonly hotelClientService: HotelClientService,
  ) {}

  @Get(':clientId/export/report')
  async exportReport(
    @Param('clientId') clientId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('section') section: string = 'overview',
    @Res() res: Response,
  ) {
    if (!SUPPORTED_SECTIONS.includes(section as ExportSection)) {
      throw new BadRequestException(
        `Unsupported export section "${section}". Supported: ${SUPPORTED_SECTIONS.join(', ')}`,
      );
    }

    const fromDate = from ? new Date(from) : this.defaultFrom();
    const toDate = to ? new Date(to) : new Date();

    const [clientResult, overviewResult] = await Promise.all([
      this.hotelClientService.findById(clientId),
      this.overviewService.getOverview(clientId, fromDate, toDate),
    ]);

    if (clientResult.status >= 400) {
      return res.status(clientResult.status).json(clientResult.data);
    }
    if (overviewResult.status >= 400) {
      return res.status(overviewResult.status).json(overviewResult.data);
    }

    const html = this.buildOverviewHtml(
      (clientResult.data as { hotel_name: string }).hotel_name,
      overviewResult.data,
    );

    const pdf = await this.pdfExportProvider.render(html);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="relatorio-${clientId}-${this.isoDate(fromDate)}_${this.isoDate(toDate)}.pdf"`,
    );
    return res.status(200).send(pdf);
  }

  // ─── Template ────────────────────────────────────────────────────────────

  private buildOverviewHtml(hotelName: string, overview: any): string {
    const period = overview?.period ?? {};
    const directVsOta = overview?.directVsOta ?? {};
    const media = overview?.media ?? {};
    const whatsapp = overview?.whatsapp ?? {};

    const money = (m?: { value: number }) =>
      m ? (m.value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
    const metricValue = (m?: { value: number }) => (m ? m.value : '—');

    return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 0; padding: 0; }
  header { border-bottom: 3px solid #0f172a; padding-bottom: 12px; margin-bottom: 24px; }
  header h1 { font-size: 20px; margin: 0 0 4px; }
  header .brand { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #64748b; }
  header .period { font-size: 12px; color: #64748b; margin-top: 4px; }
  section { margin-bottom: 20px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; }
  td.label { color: #64748b; width: 60%; }
  td.value { text-align: right; font-weight: 600; }
</style>
</head>
<body>
  <header>
    <div class="brand">RÉSERVE</div>
    <h1>${this.escape(hotelName ?? '')}</h1>
    <div class="period">Período: ${this.escape(period.from ?? '')} a ${this.escape(period.to ?? '')}</div>
  </header>

  <section>
    <h2>Direto vs. OTA</h2>
    <table>
      <tr><td class="label">Receita direta</td><td class="value">${money(directVsOta.directRevenue)}</td></tr>
      <tr><td class="label">Receita OTA</td><td class="value">${money(directVsOta.otaRevenue)}</td></tr>
      <tr><td class="label">% direto</td><td class="value">${metricValue(directVsOta.directPct)}%</td></tr>
      <tr><td class="label">Comissão recuperada</td><td class="value">${money(directVsOta.commissionRecovered)}</td></tr>
    </table>
  </section>

  <section>
    <h2>Mídia paga</h2>
    <table>
      <tr><td class="label">Investimento</td><td class="value">${money(media.spend)}</td></tr>
      <tr><td class="label">ROAS</td><td class="value">${metricValue(media.roas)}</td></tr>
      <tr><td class="label">Custo por reserva</td><td class="value">${money(media.costPerBooking)}</td></tr>
    </table>
  </section>

  <section>
    <h2>WhatsApp</h2>
    <table>
      <tr><td class="label">Cliques</td><td class="value">${metricValue(whatsapp.clicks)}</td></tr>
    </table>
  </section>
</body>
</html>`;
  }

  private escape(value: string): string {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[c] as string));
  }

  private defaultFrom(): Date {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }

  private isoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
