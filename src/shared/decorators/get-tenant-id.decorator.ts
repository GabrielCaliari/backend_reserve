import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetTenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // TenantGuard attaches tenant_id to request
    return request.tenant_id ? Number(request.tenant_id) : undefined;
  },
);
