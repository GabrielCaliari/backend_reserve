import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetTenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // TenantGuard attaches tenant_id to request (CUID string)
    return request.tenant_id ? String(request.tenant_id) : undefined;
  },
);
