import {
  IsString,
  IsBoolean,
  IsOptional,
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

function hasXSS(value: string): boolean {
  if (typeof value !== 'string') return false;
  // Detects <script>...</script>
  const scriptTag = /<script[\s\S]*?>[\s\S]*?<\/script>/i;
  // Detects on* event attributes inside HTML tags
  const onAttr = /<[^>]+\s(on\w+)\s*=\s*['"][^'"]*['"]/i;
  // Detects javascript: in href or src attributes
  const jsProtocol = /<[^>]+(href|src)\s*=\s*['"]javascript:[^'"]*['"]/i;
  return scriptTag.test(value) || onAttr.test(value) || jsProtocol.test(value);
}

export function NoXSS(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'noXSS',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          return !hasXSS(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} contains potential malicious scripts (XSS)`;
        },
      },
    });
  };
}

export class CreatePrimaryCopyVariantDto {
  @ApiProperty({
    description: 'Email HTML content (validated against XSS)',
    example: '<h1>Sale {{discount}}% OFF</h1><p>Hello {{name}}, enjoy!</p>',
  })
  @IsString()
  @NoXSS({ message: 'HTML contains potential malicious scripts (XSS)' })
  html: string;

  @ApiProperty({
    description: 'Email Markdown content (validated against XSS)',
    example: '# Sale {{discount}}% OFF\n\nHello {{name}}, enjoy!',
  })
  @IsString()
  @NoXSS({ message: 'Markdown contains potential malicious scripts (XSS)' })
  md: string;

  @ApiProperty({
    description: 'Email subject line',
    example: 'Black Friday: 50% OFF on all plans!',
  })
  @IsString()
  subject: string;

  @ApiProperty({
    description: 'Sender display name',
    example: 'Zarp Team',
  })
  @IsString()
  from_name: string;

  @ApiPropertyOptional({
    description: 'Email pre-header text (visible in inbox preview)',
    example: 'Do not miss this opportunity!',
  })
  @IsString()
  @IsOptional()
  pre_header?: string;

  @ApiProperty({
    description: 'Use default template header',
    example: true,
  })
  @IsBoolean()
  use_header: boolean;

  @ApiProperty({
    description: 'Use default template footer',
    example: true,
  })
  @IsBoolean()
  use_footer: boolean;
}
