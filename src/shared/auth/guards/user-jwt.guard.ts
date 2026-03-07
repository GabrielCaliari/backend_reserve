import { CanActivate, ExecutionContext, Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { ITokenValidator, USER_TOKEN_VALIDATOR } from '../interfaces/token-validator.interface';

/**
 * Guard to validate user JWT token
 * Requires USER_TOKEN_VALIDATOR to be provided in the module
 * 
 * Usage:
 * @UseGuards(UserJwtGuard)
 * @Get()
 * async getUserData(@CurrentUser() user: CurrentUserPayload) {
 *   // user.user_id is available here
 * }
 */
@Injectable()
export class UserJwtGuard implements CanActivate {
  constructor(
    @Inject(USER_TOKEN_VALIDATOR)
    private readonly tokenValidator: ITokenValidator,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const headers = request.headers;

    const authHeader = headers.authorization;
    const sessionId = headers['session-id'];

    if (!authHeader || !sessionId) {
      throw new UnauthorizedException('Missing authorization header or session-id');
    }

    const tokenRegex = /^Bearer\s[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
    if (!tokenRegex.test(authHeader)) {
      throw new UnauthorizedException('Invalid authorization token format');
    }

    const token = authHeader.replace('Bearer ', '');
    const result = await this.tokenValidator.validate(token, sessionId);

    if (!result.valid) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Attach to request for controllers
    request.user_id = result.userId;
    request.token = token;
    request['session-id'] = sessionId;

    return true;
  }
}
