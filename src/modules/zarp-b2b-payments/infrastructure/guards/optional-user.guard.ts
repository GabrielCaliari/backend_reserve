import { Injectable, CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { ITokenValidator, USER_TOKEN_VALIDATOR } from '../../../../shared/auth/interfaces/token-validator.interface';

/**
 * Guard opcional que permite acesso tanto para usuários autenticados quanto não autenticados.
 * Se houver token JWT válido, popula req.user_id. Caso contrário, permite acesso sem user.
 * 
 * Usado para endpoints B2B onde leads podem comprar sem criar conta.
 * 
 * Diferente do UserJwtGuard:
 * - UserJwtGuard: Bloqueia se não houver token válido (throw UnauthorizedException)
 * - OptionalUserGuard: Permite acesso mesmo sem token (request.user_id = null)
 */
@Injectable()
export class OptionalUserGuard implements CanActivate {
  constructor(
    @Inject(USER_TOKEN_VALIDATOR)
    private readonly tokenValidator: ITokenValidator,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const headers = request.headers;

    const authHeader = headers.authorization;
    const sessionId = headers['session-id'];

    // Se não houver token, permite acesso como lead (não autenticado)
    if (!authHeader || !sessionId) {
      request.user_id = null;
      request.token = null;
      return true;
    }

    // Valida formato do token
    const tokenRegex = /^Bearer\s[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
    if (!tokenRegex.test(authHeader)) {
      // Token inválido - permite acesso como lead
      request.user_id = null;
      request.token = null;
      return true;
    }

    try {
      const token = authHeader.replace('Bearer ', '');
      const result = await this.tokenValidator.validate(token, sessionId);

      if (result.valid) {
        // Token válido - popula dados do usuário
        request.user_id = result.userId;
        request.token = token;
        request['session-id'] = sessionId;
      } else {
        // Token inválido ou expirado - permite acesso como lead
        request.user_id = null;
        request.token = null;
      }
    } catch (error) {
      // Erro na validação - permite acesso como lead
      request.user_id = null;
      request.token = null;
    }

    return true;
  }
}
