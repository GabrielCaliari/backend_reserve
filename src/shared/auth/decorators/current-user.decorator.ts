import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  user_id: number;
  token: string;
  'session-id': number;
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
    };

    return data ? user[data] : user;
  },
);
