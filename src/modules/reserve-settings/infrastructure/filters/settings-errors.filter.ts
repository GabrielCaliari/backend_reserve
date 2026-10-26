import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import {
  ForbiddenSettingError,
  InvalidSettingValueError,
  UnknownSettingError,
} from '../../domain/exceptions/settings.errors';

/**
 * Os erros de dominio do settings chegavam ao ExceptionsHandler como 500. Modulo
 * ou chave que nao existe e 404, valor fora do schema e 400 e chave que o tenant
 * nao pode gravar e 403 — erro do cliente, nao do servidor.
 */
@Catch(UnknownSettingError, InvalidSettingValueError, ForbiddenSettingError)
export class SettingsErrorsFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost) {
    const status =
      error instanceof UnknownSettingError
        ? HttpStatus.NOT_FOUND
        : error instanceof InvalidSettingValueError
          ? HttpStatus.BAD_REQUEST
          : HttpStatus.FORBIDDEN;
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ statusCode: status, message: error.message, error: error.name });
  }
}
