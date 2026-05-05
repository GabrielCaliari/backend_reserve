import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Postura deny-by-default: inverte "rota sem guard = aberta". Registrado
 * como APP_GUARD; deixa passar qualquer rota que já foi classificada
 * explicitamente — @Public() ou qualquer @UseGuards no handler/classe — e
 * 403 o resto. NÃO autentica nada sozinho: a checagem real continua na
 * cadeia de guards da própria rota.
 *
 * Kill-switch: SECURITY_POSTURE_ENFORCE=false roda em modo log-only (nunca
 * 403, só loga um warn) — usar durante a Task 8 (auditoria), até toda rota
 * estar classificada. Qualquer outro valor (inclusive variável ausente)
 * enforce normalmente.
 */
@Injectable()
export class SecurityPostureGuard implements CanActivate {
  private readonly logger = new Logger(SecurityPostureGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (request.method === 'OPTIONS') {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const classGuards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, context.getClass()) ?? [];
    const handlerGuards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, context.getHandler()) ?? [];
    if (classGuards.length + handlerGuards.length > 0) {
      return true;
    }

    const enforced = process.env.SECURITY_POSTURE_ENFORCE !== 'false';

    this.logger.warn(
      `Unclassified route ${enforced ? 'denied' : 'detected (log-only, SECURITY_POSTURE_ENFORCE=false)'}: ${request.method} ${request.url} — add an auth guard or @Public()`,
    );

    if (!enforced) {
      return true;
    }

    throw new ForbiddenException('Route is not security-classified');
  }
}
