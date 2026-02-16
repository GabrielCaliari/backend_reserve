import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentAdminPayload {
  admin_id: number;
  token: string;
  'session-id': number;
}

/**
 * Decorator to extract current admin from request
 * Used with @UseGuards(AdminJwtGuard)
 */
export const CurrentAdmin = createParamDecorator(
  (data: keyof CurrentAdminPayload | undefined, ctx: ExecutionContext): CurrentAdminPayload | any => {
    const request = ctx.switchToHttp().getRequest();
    const admin: CurrentAdminPayload = {
      admin_id: request.admin_id,
      token: request.token,
      'session-id': request['session-id'],
    };

    return data ? admin[data] : admin;
  },
);
