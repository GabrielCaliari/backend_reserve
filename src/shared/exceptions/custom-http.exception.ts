import { HttpException, HttpStatus } from '@nestjs/common';

export class CustomHttpException extends HttpException {
  public override message: string;
  public override cause: string;

  constructor({ message, cause, code }: { message?: string; cause?: string; code?: string }) {
    super(
      { code },
      HttpStatus.FORBIDDEN,
      {
        description: message,
        cause: cause,
      },
    );
  }
}
