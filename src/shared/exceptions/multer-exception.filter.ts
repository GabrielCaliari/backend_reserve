import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { MulterError } from 'multer';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(MulterExceptionFilter.name);

  catch(exception: MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.BAD_REQUEST;
    let message = 'File upload error';

    // Log the error for debugging
    this.logger.error(`Multer error: ${exception.code}`, exception.stack);

    switch (exception.code) {
      case 'LIMIT_FILE_SIZE':
        status = HttpStatus.PAYLOAD_TOO_LARGE;
        message = 'File size exceeds the allowed limit (50 MB)';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = `Unexpected field: ${exception.field}`;
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Field name too long';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Field value too long';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Too many parts in multipart request';
        break;
      default:
        // Handle connection errors that might not have a specific code
        if (exception.message?.includes('ECONNRESET') || 
            exception.message?.includes('EPIPE') ||
            exception.message?.includes('aborted')) {
          status = HttpStatus.SERVICE_UNAVAILABLE;
          message = 'Upload connection interrupted. Please try again with a smaller file or check your network connection.';
        }
    }

    // Ensure response hasn't been sent already
    if (!response.headersSent) {
      response.status(status).json({
        statusCode: status,
        message,
        error: exception.code || 'UPLOAD_ERROR',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }
}
