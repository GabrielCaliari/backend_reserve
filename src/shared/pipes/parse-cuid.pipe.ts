import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseCuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const cuidRegex = /^c[a-z0-9]{24}$/;

    if (!cuidRegex.test(value)) {
      throw new BadRequestException('Invalid CUID format. Expected a 25-character lowercase identifier.');
    }

    return value;
  }
}