import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseUUIDPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    // Validate CUID2 format (25-character lowercase alphanumeric)
    const cuid2Regex = /^[a-z0-9]{25}$/;
    if (!cuid2Regex.test(value)) {
      throw new BadRequestException('Invalid UUID format');
    }
    return value;
  }
}
