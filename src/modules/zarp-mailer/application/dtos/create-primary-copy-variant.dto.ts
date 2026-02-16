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
  // Detecta <script>...</script>
  const scriptTag = /<script[\s\S]*?>[\s\S]*?<\/script>/i;
  // Detecta atributos on* dentro de tags HTML
  const onAttr = /<[^>]+\s(on\w+)\s*=\s*['"][^'"]*['"]/i;
  // Detecta javascript: em atributos href ou src
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
          return `${args.property} contém possíveis scripts maliciosos (XSS)`;
        },
      },
    });
  };
}

export class CreatePrimaryCopyVariantDto {
  @ApiProperty({
    description: 'Conteúdo HTML do email (validado contra XSS)',
    example: '<h1>Promoção {{discount}}% OFF</h1><p>Olá {{name}}, aproveite!</p>',
  })
  @IsString()
  @NoXSS({ message: 'HTML contém possíveis scripts maliciosos (XSS)' })
  html: string;

  @ApiProperty({
    description: 'Conteúdo Markdown do email (validado contra XSS)',
    example: '# Promoção {{discount}}% OFF\n\nOlá {{name}}, aproveite!',
  })
  @IsString()
  @NoXSS({ message: 'Markdown contém possíveis scripts maliciosos (XSS)' })
  md: string;

  @ApiProperty({
    description: 'Assunto do email',
    example: 'Black Friday: 50% OFF em todos os planos!',
  })
  @IsString()
  subject: string;

  @ApiProperty({
    description: 'Nome do remetente',
    example: 'Equipe Zarp',
  })
  @IsString()
  from_name: string;

  @ApiPropertyOptional({
    description: 'Pré-header do email (texto visível na prévia)',
    example: 'Não perca essa oportunidade!',
  })
  @IsString()
  @IsOptional()
  pre_header?: string;

  @ApiProperty({
    description: 'Usar header padrão do template',
    example: true,
  })
  @IsBoolean()
  use_header: boolean;

  @ApiProperty({
    description: 'Usar footer padrão do template',
    example: true,
  })
  @IsBoolean()
  use_footer: boolean;
}
