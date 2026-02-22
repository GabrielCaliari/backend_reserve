import { HttpException, HttpStatus } from '@nestjs/common';

export class InvalidCollectionSecretKeyException extends HttpException {
  constructor() {
    super('Invalid or missing collection secret key', HttpStatus.UNAUTHORIZED);
  }
}
