import { HttpException, HttpStatus } from '@nestjs/common';

export class InvalidBlogSecretKeyException extends HttpException {
  constructor() {
    super('Invalid or missing blog secret key', HttpStatus.UNAUTHORIZED);
  }
}
