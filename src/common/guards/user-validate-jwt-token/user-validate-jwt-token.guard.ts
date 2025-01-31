import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { errorTypes } from 'src/core/error-types';
import CustomHttpException from 'src/core/exceptions/CustomHttpException';
import { UserService } from 'src/modules/user/user.service';

@Injectable()
export class UserValidateJwtTokenGuard implements CanActivate {
	constructor(
		private readonly userService: UserService
	) { }

	async canActivate(
		context: ExecutionContext,
	): Promise<boolean> {
		const req = context.switchToHttp().getRequest();
		const headers = req.headers;

		if (
			headers.hasOwnProperty('authorization') &&
			headers.hasOwnProperty('session-id') &&
			/^Bearer\s[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(headers.authorization) &&
			+headers['session-id']
		) {
			const token = headers.authorization.replaceAll('Bearer ', '') as string;
			const canActivateResult = await this.userService.validateToken({ token, 'session-id': +headers['session-id'] }) as { status, data: { user_id: number } };

			if (canActivateResult.status === 200) {
				req.user_id = canActivateResult.data.user_id;
				req.token = token;
				req['session-id'] = headers['session-id'];
				return true;
			}
		}

		throw new CustomHttpException({
			code: errorTypes._401.user_token_in
		});
	}
}
