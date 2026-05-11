import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseCuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const cuidRegex = /^[a-z0-9]{2,32}$/;

    if (!cuidRegex.test(value)) {
      throw new BadRequestException('Invalid CUID format. Expected a valid alphanumeric identifier.');
    }

    return value;
  }
}