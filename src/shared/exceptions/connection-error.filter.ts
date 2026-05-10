import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request, NextFunction } from 'express';

/**
 * ConnectionErrorFilter
 * 
 * Catches connection errors that occur during file uploads or large requests.
 * These errors typically happen when:
 * - Client disconnects during upload
 * - Network timeout occurs
 * - Connection is reset by peer
 * - Broken pipe (EPIPE)
 * 
 * Without this filter, these errors result in silent 503 responses with no body.
 */
@Catch()
export class ConnectionErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ConnectionErrorFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const next = ctx.getNext<NextFunction>();

    // Only handle connection-related errors
    const isConnectionError = 
      exception?.code === 'ECONNRESET' ||
      exception?.code === 'EPIPE' ||
      exception?.code === 'ECONNABORTED' ||
      exception?.code === 'ETIMEDOUT' ||
      exception?.message?.includes('aborted') ||
      exception?.message?.includes('connection') ||
      exception?.message?.includes('timeout');

    if (!isConnectionError) {
      // Delegate to Express error middleware chain (NestJS built-in handler picks it up)
      // NOTE: `throw exception` here escapes NestJS filter chain and hits Express's raw
      // error handler, which returns HTML. Using next(exception) properly re-enters the chain.
      return next(exception);
    }

    // Log the connection error
    this.logger.warn(
      `Connection error during ${request.method} ${request.url}: ${exception?.code || exception?.message}`,
      {
        code: exception?.code,
        message: exception?.message,
        url: request.url,
        method: request.method,
        contentLength: request.headers['content-length'],
      }
    );

    // Only send response if headers haven't been sent
    if (!response.headersSent) {
      const status = HttpStatus.SERVICE_UNAVAILABLE;
      const message = this.getErrorMessage(exception);

      response.status(status).json({
        statusCode: status,
        message,
        error: 'CONNECTION_ERROR',
        code: exception?.code,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  private getErrorMessage(exception: any): string {
    if (exception?.code === 'ECONNRESET') {
      return 'Connection was reset during upload. This usually happens with large files. Please try again or use a smaller file.';
    }
    
    if (exception?.code === 'EPIPE') {
      return 'Connection was closed unexpectedly. Please check your network and try again.';
    }
    
    if (exception?.code === 'ETIMEDOUT') {
      return 'Upload timed out. Please try again with a smaller file or check your network connection.';
    }
    
    if (exception?.message?.includes('aborted')) {
      return 'Upload was aborted. Please try again.';
    }

    return 'Connection error during upload. Please try again.';
  }
}
