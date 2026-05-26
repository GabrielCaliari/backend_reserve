import { CanActivate, ExecutionContext, Injectable, Inject, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { CUSTOMER_TOKEN_VALIDATOR, ICustomerTokenValidator } from '../providers/customer-token-validator.provider';

@Injectable()
export class CustomerAdminGuard implements CanActivate {
  constructor(
    @Inject(CUSTOMER_TOKEN_VALIDATOR)
    private readonly tokenValidator: ICustomerTokenValidator,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.['licensefix_session'];
    const sessionId = request.headers['session-id'];

    if (!token || !sessionId) {
      throw new UnauthorizedException('Missing session credentials.');
    }

    const result = await this.tokenValidator.validate(token, sessionId);

    if (!result.valid) {
      throw new UnauthorizedException('Invalid or expired session.');
    }

    if (result.role !== 'admin') {
      throw new ForbiddenException('Admin access required.');
    }

    request.customer_id = result.customerId;
    request.tenant_id = result.tenantId;
    request.customer_role = result.role;
    request.token = token;
    request['session-id'] = sessionId;

    return true;
  }
}
