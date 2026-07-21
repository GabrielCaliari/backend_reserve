import { Injectable, Logger } from '@nestjs/common';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

/**
 * Server-side PDF rendering via headless Chrome (Fase 6 Task 1).
 *
 * Decision (flagged in the plan as needing confirmation, resolved here per
 * the plan's own stated default): Puppeteer + `@sparticuz/chromium`, the
 * standard combination for running headless Chrome inside a Vercel
 * serverless function. The alternative — `pdfkit`/`@react-pdf/renderer`
 * building the PDF programmatically — avoids the cold-start cost but forces
 * maintaining a second rendering path (screen HTML + PDF layout) instead of
 * one shared template. This plan renders the same server-built HTML string
 * the caller already assembles from the screen's own data contracts, so one
 * template serves both. Revisit if cold-start latency proves unacceptable
 * in production.
 */
@Injectable()
export class PdfExportProvider {
  private readonly logger = new Logger(PdfExportProvider.name);

  /**
   * Renders an HTML string to a PDF buffer using headless Chrome.
   * Local dev (no AWS_LAMBDA_FUNCTION_NAME/VERCEL env) falls back to
   * whatever Chrome/Chromium executable is available via
   * PUPPETEER_EXECUTABLE_PATH, since `@sparticuz/chromium`'s bundled binary
   * only targets the Lambda/Vercel runtime.
   */
  async render(html: string): Promise<Buffer> {
    const executablePath = await this.resolveExecutablePath();

    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const buffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      });
      return Buffer.from(buffer);
    } catch (error) {
      this.logger.error('PDF rendering failed', error);
      throw new Error(
        `PDF rendering failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      await browser.close();
    }
  }

  private async resolveExecutablePath(): Promise<string> {
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      return process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    return chromium.executablePath();
  }
}
