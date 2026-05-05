import { Controller, Get, Logger, Param, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { WhatsAppTrackingService } from '../../application/services/whatsapp-tracking.service';
import { Public } from '../../../../shared/auth/decorators/public.decorator';

@Controller('wa')
@Public()
export class WhatsAppRedirectController {
  private readonly logger = new Logger(WhatsAppRedirectController.name);

  constructor(private readonly trackingService: WhatsAppTrackingService) {}

  @Get(':code')
  async redirect(
    @Param('code') code: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // NOTE: this handler uses @Res() directly, so Nest's global exception
    // filters do NOT apply here. Any thrown error would bubble up to the
    // serverless platform and crash the function (FUNCTION_INVOCATION_FAILED).
    // We therefore guard the entire handler and always send a response.
    try {
      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
        req.socket?.remoteAddress ??
        '';

      const userAgent = req.headers['user-agent'] ?? '';
      const referer = req.headers['referer'] ?? '';

      // Geo headers injected for free by Vercel's edge network. decodeURIComponent
      // can throw on malformed input, so each one is decoded defensively.
      const decode = (v: unknown): string | null => {
        if (typeof v !== 'string' || !v.length) return null;
        try {
          return decodeURIComponent(v);
        } catch {
          return v; // keep the raw value rather than crash
        }
      };

      const geoHeaders = {
        country: decode(req.headers['x-vercel-ip-country']),
        region: decode(req.headers['x-vercel-ip-country-region']),
        city: decode(req.headers['x-vercel-ip-city']),
      };

      const waUrl = await this.trackingService.resolveAndTrack(
        code,
        ip,
        userAgent,
        referer,
        geoHeaders,
      );

      if (!waUrl) {
        return res.status(404).json({ message: 'Link not found or inactive' });
      }

      return res.redirect(302, waUrl);
    } catch (error) {
      this.logger.error(`Redirect failed for code "${code}": ${error?.message}`, error?.stack);
      return res.status(500).json({ message: 'Internal error' });
    }
  }
}
