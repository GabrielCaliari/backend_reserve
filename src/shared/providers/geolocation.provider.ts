import { Injectable, Logger } from '@nestjs/common';

export interface GeolocationData {
  country?: string;
  city?: string;
  region?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
}

@Injectable()
export class GeolocationProvider {
  private readonly logger = new Logger(GeolocationProvider.name);
  private readonly baseUrl = 'https://ipapi.co';
  private readonly timeout = 3000; // 3 seconds timeout

  /**
   * Resolve IP address to geolocation data using ipapi.co
   * Free tier: 1,000 requests/day, no API key required
   */
  async resolveIp(ipAddress: string): Promise<GeolocationData | null> {
    if (!ipAddress || this.isPrivateIp(ipAddress)) {
      this.logger.debug(`Skipping geolocation for private/invalid IP: ${ipAddress}`);
      return null;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/${ipAddress}/json/`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'reserve-API/1.0',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        this.logger.warn(`ipapi.co returned status ${response.status} for IP ${ipAddress}`);
        return null;
      }

      const data = await response.json();

      // Check for error response from ipapi.co
      if (data.error) {
        this.logger.warn(`ipapi.co error for IP ${ipAddress}: ${data.reason}`);
        return null;
      }

      return {
        country: data.country_name || undefined,
        city: data.city || undefined,
        region: data.region || undefined,
        countryCode: data.country_code || undefined,
        latitude: data.latitude || undefined,
        longitude: data.longitude || undefined,
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        this.logger.warn(`Geolocation request timeout for IP ${ipAddress}`);
      } else {
        this.logger.error(`Failed to geolocate IP ${ipAddress}:`, error.message);
      }
      return null;
    }
  }

  /**
   * Check if IP is private/local (should not be geolocated)
   */
  private isPrivateIp(ip: string): boolean {
    if (!ip) return true;

    // Remove IPv6 prefix if present
    const cleanIp = ip.replace(/^::ffff:/, '');

    // Localhost
    if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'localhost') {
      return true;
    }

    // Private IPv4 ranges
    const privateRanges = [
      /^10\./,                    // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
      /^192\.168\./,              // 192.168.0.0/16
      /^169\.254\./,              // 169.254.0.0/16 (link-local)
    ];

    return privateRanges.some(range => range.test(cleanIp));
  }

  /**
   * Batch resolve multiple IPs (useful for background processing)
   * Adds delay between requests to respect rate limits
   */
  async resolveIpBatch(ipAddresses: string[], delayMs = 100): Promise<Map<string, GeolocationData | null>> {
    const results = new Map<string, GeolocationData | null>();

    for (const ip of ipAddresses) {
      const data = await this.resolveIp(ip);
      results.set(ip, data);

      // Add delay between requests to avoid rate limiting
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }
}
