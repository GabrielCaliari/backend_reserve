import { CorsOriginService } from './cors-origin.service';

export type CorsOriginCallback = (error: Error | null, allow?: boolean) => void;

/**
 * Express/Nest `cors` origin resolver backed by CorsOriginService.
 *
 * Extracted from main.ts so the no-Origin rule is unit-testable: non-browser
 * clients (curl, server-to-server, Stripe/booking-engine webhooks) send no
 * Origin header and CORS does not apply to them — they pass before any DB read.
 */
export function createCorsOriginResolver(service: CorsOriginService) {
  return (origin: string | undefined, callback: CorsOriginCallback): void => {
    if (!origin) {
      callback(null, true);
      return;
    }

    service
      .isAllowed(origin)
      .then((allowed) => callback(null, allowed))
      .catch((error) => callback(error as Error, false));
  };
}
