import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

/** B3: protege o disparo externo dos crons (Vercel Cron, agendador do host ou chamada manual). */
@Injectable()
export class CronSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secret = process.env.CRON_SECRET;
    const header = String(context.switchToHttp().getRequest().headers?.authorization ?? '');
    const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!secret || !provided) throw new UnauthorizedException();
    const a = Buffer.from(provided);
    const b = Buffer.from(secret);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new UnauthorizedException();
    return true;
  }
}
