import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { EUserCollectionRole } from '../../../modules/zarp-auth/domain/enums/user-collection-role.enum';

export interface CurrentUserPayload {
  user_id: string;
  token: string;
  'session-id': string;
  tenant_id?: string;
  collection_id?: string;
  user_role?: EUserCollectionRole;
}

/**
 * Decorator to extract current user from request
 * Used with @UseGuards(UserJwtGuard)
 */
export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserPayload | undefined, ctx: ExecutionContext): CurrentUserPayload | any => {
    const request = ctx.switchToHttp().getRequest();
    const user: CurrentUserPayload = {
      user_id: request.user_id,
      token: request.token,
      'session-id': request['session-id'],
      tenant_id: request.tenant_id,
      collection_id: request.collection_id,
      user_role: request.user_role,
    };

    return data ? user[data] : user;
  },
);
