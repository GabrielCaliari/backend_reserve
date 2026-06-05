import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { WhatsAppTrackingService } from '../../application/services/whatsapp-tracking.service';

@Controller('wa')
export class WhatsAppRedirectController {
  constructor(private readonly trackingService: WhatsAppTrackingService) {}

  @Get(':code')
  async redirect(
    @Param('code') code: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket?.remoteAddress ??
      '';

    const userAgent = req.headers['user-agent'] ?? '';
    const referer = req.headers['referer'] ?? '';

    // Geo headers injected for free by Vercel's edge network — no external
    // lookup, no rate limit, includes city/region/country.
    const decode = (v: unknown): string | null =>
      typeof v === 'string' && v.length ? decodeURIComponent(v) : null;

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
  }
}
