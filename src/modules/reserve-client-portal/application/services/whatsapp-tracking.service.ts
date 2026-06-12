import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { GeolocationProvider } from '../../../../shared/providers/geolocation.provider';
import { errorResponse, successResponse } from '../../../../shared/helpers';
import {
  CreateWhatsAppTrackingLinkDto,
  UpdateWhatsAppTrackingLinkDto,
} from '../dtos/whatsapp-tracking-link.dto';

interface GeoHeaders {
  country: string | null;
  region: string | null;
  city: string | null;
}

@Injectable()
export class WhatsAppTrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geolocation: GeolocationProvider,
  ) {}

  async createLink(clientId: string, adminId: string, dto: CreateWhatsAppTrackingLinkDto) {
    try {
      let shortCode: string;

      if (dto.custom_code) {
        // Explicit custom slug: must be unique (409 if taken).
        const slug = this.normalizeSlug(dto.custom_code);
        const taken = await this.prisma.whatsAppTrackingLink.findUnique({
          where: { short_code: slug },
        });
        if (taken) return errorResponse('409:WHATSAPP_LINK_CODE_TAKEN', 409);
        shortCode = slug;
      } else {
        // No custom_code: derive the slug from the link name so the URL reads
        // like the campaign (e.g. "Atendimento" -> /wa/atendimento). Falls back
        // to a random code only when the name has no usable characters.
        const base = this.slugify(dto.name);
        shortCode = base ? await this.makeUniqueSlug(base) : this.generateShortCode();
      }

      const link = await this.prisma.whatsAppTrackingLink.create({
        data: {
          client_id: clientId,
          name: dto.name,
          description: dto.description ?? null,
          phone_number: this.sanitizePhone(dto.phone_number),
          message: dto.message ?? null,
          short_code: shortCode,
          utm_source: dto.utm_source ?? null,
          utm_medium: dto.utm_medium ?? null,
          utm_campaign: dto.utm_campaign ?? null,
          created_by: adminId,
        },
      });

      return successResponse(
        { ...link, redirect_url: this.buildRedirectUrl(shortCode) },
        201,
      );
    } catch (error) {
      return errorResponse('500:WHATSAPP_LINK_NOT_CREATED', 500, error);
    }
  }

  async findLinks(clientId: string) {
    try {
      const links = await this.prisma.whatsAppTrackingLink.findMany({
        where: { client_id: clientId },
        orderBy: { created_at: 'desc' },
        include: {
          _count: { select: { Clicks: true } },
        },
      });

      const result = links.map((link) => ({
        ...link,
        total_clicks: link._count.Clicks,
        redirect_url: this.buildRedirectUrl(link.short_code),
        _count: undefined,
      }));

      return successResponse(result);
    } catch (error) {
      return errorResponse('500:WHATSAPP_LINKS_NOT_FOUND', 500, error);
    }
  }

  async getLinkStats(clientId: string, linkId: string) {
    try {
      const link = await this.prisma.whatsAppTrackingLink.findFirst({
        where: { id: linkId, client_id: clientId },
        include: {
          Clicks: {
            orderBy: { clicked_at: 'desc' },
            take: 100,
            select: {
              id: true,
              clicked_at: true,
              country: true,
              region: true,
              city: true,
              device_type: true,
              referer: true,
            },
          },
          _count: { select: { Clicks: true } },
        },
      });

      if (!link) return errorResponse('404:WHATSAPP_LINK_NOT_FOUND', 404);

      const clicksByDay = await this.prisma.$queryRaw<{ day: string; count: number }[]>`
        SELECT DATE(clicked_at) as day, COUNT(*) as count
        FROM whatsapp_link_clicks
        WHERE link_id = ${linkId}
        GROUP BY DATE(clicked_at)
        ORDER BY day DESC
        LIMIT 30
      `;

      const clicksByDevice = await this.prisma.$queryRaw<{ device_type: string; count: number }[]>`
        SELECT COALESCE(device_type, 'unknown') as device_type, COUNT(*) as count
        FROM whatsapp_link_clicks
        WHERE link_id = ${linkId}
        GROUP BY device_type
      `;

      const clicksByCountry = await this.prisma.$queryRaw<{ country: string; count: number }[]>`
        SELECT COALESCE(country, 'unknown') as country, COUNT(*) as count
        FROM whatsapp_link_clicks
        WHERE link_id = ${linkId}
        GROUP BY country
        ORDER BY count DESC
        LIMIT 10
      `;

      const clicksByRegion = await this.prisma.$queryRaw<{ region: string; count: number }[]>`
        SELECT COALESCE(region, 'unknown') as region, COUNT(*) as count
        FROM whatsapp_link_clicks
        WHERE link_id = ${linkId}
        GROUP BY region
        ORDER BY count DESC
        LIMIT 10
      `;

      const clicksByCity = await this.prisma.$queryRaw<{ city: string; count: number }[]>`
        SELECT COALESCE(city, 'unknown') as city, COUNT(*) as count
        FROM whatsapp_link_clicks
        WHERE link_id = ${linkId}
        GROUP BY city
        ORDER BY count DESC
        LIMIT 10
      `;

      return successResponse({
        link: {
          ...link,
          total_clicks: link._count.Clicks,
          redirect_url: this.buildRedirectUrl(link.short_code),
          Clicks: undefined,
          _count: undefined,
        },
        recent_clicks: link.Clicks,
        stats: {
          total: link._count.Clicks,
          by_day: clicksByDay.map((r) => ({ day: r.day, count: Number(r.count) })),
          by_device: clicksByDevice.map((r) => ({ device: r.device_type, count: Number(r.count) })),
          by_country: clicksByCountry.map((r) => ({ country: r.country, count: Number(r.count) })),
          by_region: clicksByRegion.map((r) => ({ region: r.region, count: Number(r.count) })),
          by_city: clicksByCity.map((r) => ({ city: r.city, count: Number(r.count) })),
        },
      });
    } catch (error) {
      return errorResponse('500:WHATSAPP_LINK_STATS_ERROR', 500, error);
    }
  }

  async updateLink(clientId: string, linkId: string, dto: UpdateWhatsAppTrackingLinkDto) {
    try {
      const exists = await this.prisma.whatsAppTrackingLink.findFirst({
        where: { id: linkId, client_id: clientId },
      });
      if (!exists) return errorResponse('404:WHATSAPP_LINK_NOT_FOUND', 404);

      let newShortCode: string | undefined;
      if (dto.custom_code) {
        const slug = this.normalizeSlug(dto.custom_code);
        if (slug !== exists.short_code) {
          const taken = await this.prisma.whatsAppTrackingLink.findUnique({
            where: { short_code: slug },
          });
          if (taken) return errorResponse('409:WHATSAPP_LINK_CODE_TAKEN', 409);
          newShortCode = slug;
        }
      }

      const link = await this.prisma.whatsAppTrackingLink.update({
        where: { id: linkId },
        data: {
          name: dto.name,
          description: dto.description,
          message: dto.message,
          is_active: dto.is_active,
          short_code: newShortCode,
          utm_source: dto.utm_source,
          utm_medium: dto.utm_medium,
          utm_campaign: dto.utm_campaign,
        },
      });

      return successResponse({
        ...link,
        redirect_url: this.buildRedirectUrl(link.short_code),
      });
    } catch (error) {
      return errorResponse('500:WHATSAPP_LINK_UPDATE_ERROR', 500, error);
    }
  }

  async deleteLink(clientId: string, linkId: string) {
    try {
      const exists = await this.prisma.whatsAppTrackingLink.findFirst({
        where: { id: linkId, client_id: clientId },
      });
      if (!exists) return errorResponse('404:WHATSAPP_LINK_NOT_FOUND', 404);

      await this.prisma.whatsAppTrackingLink.delete({ where: { id: linkId } });
      return successResponse({ deleted: true });
    } catch (error) {
      return errorResponse('500:WHATSAPP_LINK_DELETE_ERROR', 500, error);
    }
  }

  /**
   * Called by the public redirect controller.
   * Resolves the link, records the click async (fire-and-forget), and returns the WhatsApp URL.
   */
  async resolveAndTrack(
    shortCode: string,
    ipAddress: string,
    userAgent: string,
    referer: string,
    geoHeaders?: GeoHeaders,
  ): Promise<string | null> {
    let link;
    try {
      link = await this.prisma.whatsAppTrackingLink.findUnique({
        where: { short_code: shortCode },
      });
    } catch {
      // DB lookup failed — return null so the controller responds gracefully
      // instead of letting the error crash the serverless function.
      return null;
    }

    if (!link || !link.is_active) return null;

    // Skip bots/link-preview crawlers (WhatsApp, Facebook, etc.) so the stats
    // reflect real people. We still redirect them so previews keep working.
    if (!this.isBot(userAgent)) {
      // Await the click recording so it is not lost on serverless platforms
      // (e.g. Vercel) where the function may freeze right after the response is
      // sent. Any failure is swallowed so it never blocks the redirect.
      await this.recordClick(link.id, ipAddress, userAgent, referer, geoHeaders).catch(
        () => {},
      );
    }

    return this.buildWhatsAppUrl(link.phone_number, link.message, link.short_code);
  }

  private async recordClick(
    linkId: string,
    ipAddress: string,
    userAgent: string,
    referer: string,
    geoHeaders?: GeoHeaders,
  ) {
    // Prefer Vercel's edge geo headers (free, instant). Fall back to ipapi.co
    // only when they are absent (e.g. running outside Vercel / local dev).
    let country = geoHeaders?.country ?? null;
    let region = geoHeaders?.region ?? null;
    let city = geoHeaders?.city ?? null;

    if (!country && !city) {
      const geo = await this.geolocation.resolveIp(ipAddress);
      country = geo?.countryCode ?? geo?.country ?? null;
      region = geo?.region ?? null;
      city = geo?.city ?? null;
    }

    const deviceType = this.detectDevice(userAgent);

    await this.prisma.whatsAppLinkClick.create({
      data: {
        link_id: linkId,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        referer: referer ? referer.substring(0, 500) : null,
        country: this.countryName(country),
        region: region,
        city: city,
        device_type: deviceType,
      },
    });
  }

  private isBot(userAgent: string): boolean {
    if (!userAgent) return true; // no UA = almost always a bot/script
    const ua = userAgent.toLowerCase();
    return /bot|crawl|spider|facebookexternalhit|whatsapp|telegram|slackbot|twitterbot|discordbot|linkedinbot|embedly|preview|curl|wget|python-requests|axios|node-fetch|headless|lighthouse|pingdom|uptimerobot|monitor/.test(
      ua,
    );
  }

  /** Map common ISO country codes (from Vercel) to readable names. */
  private countryName(code: string | null): string | null {
    if (!code) return null;
    if (code.length !== 2) return code; // already a full name (ipapi fallback)
    const map: Record<string, string> = {
      BR: 'Brasil',
      US: 'Estados Unidos',
      PT: 'Portugal',
      AR: 'Argentina',
      ES: 'Espanha',
      GB: 'Reino Unido',
      FR: 'França',
      DE: 'Alemanha',
      IT: 'Itália',
      MX: 'México',
      CL: 'Chile',
      CO: 'Colômbia',
      UY: 'Uruguai',
      PY: 'Paraguai',
      CA: 'Canadá',
    };
    return map[code.toUpperCase()] ?? code.toUpperCase();
  }

  /**
   * §6.2: the bot recovers which link a conversation started from by parsing
   * a `[shortCode]` token out of the very first inbound message. Appending it
   * here guarantees the token is always present and recoverable, whether or
   * not the admin configured a custom pre-filled message.
   */
  private buildWhatsAppUrl(phone: string, message: string | null | undefined, shortCode: string): string {
    const clean = phone.replace(/\D/g, '');
    const base = `https://wa.me/${clean}`;
    const codeToken = `[${shortCode}]`;
    const text = message ? `${message}\n${codeToken}` : codeToken;
    return `${base}?text=${encodeURIComponent(text)}`;
  }

  private buildRedirectUrl(shortCode: string): string {
    // Branded public domain. Override via APP_URL env if needed.
    const baseUrl = process.env.APP_URL ?? 'https://link.reservemkt.com.br';
    return `${baseUrl}/wa/${shortCode}`;
  }

  private sanitizePhone(phone: string): string {
    return phone.replace(/\s/g, '').replace(/[()+-]/g, '');
  }

  /** Normalize a custom slug: trim, lowercase, strip invalid chars. */
  private normalizeSlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '');
  }

  /**
   * Turn a free-text name into a URL-friendly slug:
   * removes accents, lowercases, spaces/symbols become hyphens.
   * e.g. "Atendimento Caliári!" -> "atendimento-caliari"
   */
  private slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // strip accents
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-') // non-alphanumeric -> hyphen
      .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
      .substring(0, 50);
  }

  /** Ensure a derived slug is unique; append a short suffix on collision. */
  private async makeUniqueSlug(base: string): Promise<string> {
    let candidate = base;
    for (let attempt = 0; attempt < 5; attempt++) {
      const taken = await this.prisma.whatsAppTrackingLink.findUnique({
        where: { short_code: candidate },
      });
      if (!taken) return candidate;
      candidate = `${base}-${this.randomSuffix(4)}`;
    }
    return `${base}-${this.randomSuffix(6)}`;
  }

  private randomSuffix(length: number): string {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let out = '';
    for (let i = 0; i < length; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }

  private generateShortCode(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  private detectDevice(userAgent: string): string {
    if (!userAgent) return 'unknown';
    const ua = userAgent.toLowerCase();
    if (/tablet|ipad/.test(ua)) return 'tablet';
    if (/mobile|android|iphone|ipod|blackberry|windows phone/.test(ua)) return 'mobile';
    return 'desktop';
  }
}
