import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * UploadErrorInterceptor
 * 
 * Intercepts and handles errors during file upload operations.
 * Provides detailed error messages for common upload failures.
 * 
 * Usage:
 * @UseInterceptors(UploadErrorInterceptor)
 * async upload(@UploadedFile() file: Express.Multer.File) { ... }
 */
@Injectable()
export class UploadErrorInterceptor implements NestInterceptor {
  private readonly logger = new Logger(UploadErrorInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Add error handler for request stream
    request.on('error', (error: any) => {
      this.logger.error(`Request stream error: ${error.message}`, {
        code: error.code,
        url: request.url,
        method: request.method,
      });
    });

    // Add error handler for response stream
    response.on('error', (error: any) => {
      this.logger.error(`Response stream error: ${error.message}`, {
        code: error.code,
        url: request.url,
        method: request.method,
      });
    });

    return next.handle().pipe(
      catchError((error) => {
        // Log the error with context
        this.logger.error(`Upload error in ${request.method} ${request.url}`, {
          error: error.message,
          code: error.code,
          stack: error.stack,
          contentLength: request.headers['content-length'],
          contentType: request.headers['content-type'],
        });

        // Handle specific error types
        if (this.isConnectionError(error)) {
          return throwError(() => ({
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            message: 'Upload connection interrupted. Please try again with a smaller file or check your network connection.',
            error: 'CONNECTION_ERROR',
            code: error.code,
          }));
        }

        if (this.isTimeoutError(error)) {
          return throwError(() => ({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Upload timed out. Please try again with a smaller file.',
            error: 'TIMEOUT_ERROR',
            code: error.code,
          }));
        }

        if (this.isPayloadTooLargeError(error)) {
          return throwError(() => ({
            statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
            message: 'File size exceeds the maximum allowed limit (50 MB).',
            error: 'PAYLOAD_TOO_LARGE',
          }));
        }

        // Re-throw other errors to be handled by global filters
        return throwError(() => error);
      }),
    );
  }

  private isConnectionError(error: any): boolean {
    return (
      error?.code === 'ECONNRESET' ||
      error?.code === 'EPIPE' ||
      error?.code === 'ECONNABORTED' ||
      error?.message?.includes('aborted') ||
      error?.message?.includes('connection reset')
    );
  }

  private isTimeoutError(error: any): boolean {
    return (
      error?.code === 'ETIMEDOUT' ||
      error?.message?.includes('timeout') ||
      error?.message?.includes('timed out')
    );
  }

  private isPayloadTooLargeError(error: any): boolean {
    return (
      error?.statusCode === HttpStatus.PAYLOAD_TOO_LARGE ||
      error?.code === 'LIMIT_FILE_SIZE' ||
      error?.message?.includes('payload too large') ||
      error?.message?.includes('file size')
    );
  }
}
