import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { errorTypes } from 'src/core/error-types';
import CustomHttpException from 'src/core/exceptions/CustomHttpException';
import { AdminService } from 'src/modules/v1/admin/admin.service';


// TODO: isolar a verificação do token, remover a dependencia de um service
@Injectable()
export class AdminValidateJwtTokenGuard implements CanActivate {
	constructor(
		private readonly adminService: AdminService
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
			const canActivateResult = await this.adminService.validateToken({ token, 'session-id': +headers['session-id'] }) as { status, data: { admin_id: number } };

			if (canActivateResult.status === 200) {
				req.admin_id = canActivateResult.data.admin_id;
				req.token = token;
				req['session-id'] = headers['session-id'];
				return true;
			}
		}

		throw new CustomHttpException({
			code: errorTypes._401.admin_token_in
		});
	}
}
