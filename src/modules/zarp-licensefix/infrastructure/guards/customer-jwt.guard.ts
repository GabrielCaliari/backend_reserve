import { CanActivate, ExecutionContext, Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { CUSTOMER_TOKEN_VALIDATOR, ICustomerTokenValidator } from '../providers/customer-token-validator.provider';

@Injectable()
export class CustomerJwtGuard implements CanActivate {
  constructor(
    @Inject(CUSTOMER_TOKEN_VALIDATOR)
    private readonly tokenValidator: ICustomerTokenValidator,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.['licensefix_session'];
    const sessionId = request.headers['session-id'];

    if (!token || !sessionId) {
      throw new UnauthorizedException('Missing session cookie or session-id');
    }

    const result = await this.tokenValidator.validate(token, sessionId);

    if (!result.valid) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    request.customer_id = result.customerId;
    request.tenant_id = result.tenantId;
    request.token = token;
    request['session-id'] = sessionId;

    return true;
  }
}
