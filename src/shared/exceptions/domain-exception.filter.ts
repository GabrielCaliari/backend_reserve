import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ArticleNotFoundError } from '../../modules/reserve-cms/domain/errors/article-not-found.error';
import { ImageLimitExceededError } from '../../modules/reserve-cms/domain/errors/image-limit-exceeded.error';
import { RepositoryException } from './repository.exception';
import { ModuleDisabledError } from './module-disabled.error';
import {
  MotorDomainError,
  MotorHoldNotActiveError,
  MotorNotFoundError,
  MotorTipoEsgotadoError,
  MotorValidationError,
} from '../../modules/reserve-motor/domain/errors/motor.errors';

/**
 * Maps domain errors and repository exceptions to proper HTTP responses.
 * Without this filter, NestJS converts all non-HttpException errors to 500
 * with no useful message for the client.
 */
@Catch(
  ArticleNotFoundError,
  ImageLimitExceededError,
  RepositoryException,
  ModuleDisabledError,
  MotorDomainError,
)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = exception.message;

    if (exception instanceof ArticleNotFoundError) {
      status = HttpStatus.NOT_FOUND;
    } else if (exception instanceof ImageLimitExceededError) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
    } else if (exception instanceof ModuleDisabledError) {
      status = HttpStatus.FORBIDDEN;
    } else if (exception instanceof MotorValidationError) {
      status = HttpStatus.BAD_REQUEST;
    } else if (exception instanceof MotorNotFoundError) {
      status = HttpStatus.NOT_FOUND;
    } else if (exception instanceof MotorTipoEsgotadoError) {
      status = HttpStatus.CONFLICT;
    } else if (exception instanceof MotorHoldNotActiveError) {
      status = HttpStatus.CONFLICT;
    } else if (exception instanceof MotorDomainError) {
      status = HttpStatus.BAD_REQUEST;
    } else if (exception instanceof RepositoryException) {
      this.logger.error(`Repository error [${exception.code}]: ${exception.message}`, exception.details);
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'A database error occurred';
    }

    response.status(status).json({
      statusCode: status,
      message,
    });
  }
}
