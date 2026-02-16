import { IsString, IsNotEmpty, IsArray, ValidationArguments, IsEnum, ValidationOptions, registerDecorator, IsNumber, IsPositive, Min, IsBoolean, IsOptional, IsNumberString } from 'class-validator';
import { ECopyVariationType } from 'src/@types/@Email-campaign';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmailCampaignDTO {
    @ApiProperty({
        description: 'Nome da campanha de email',
        example: 'Campanha Black Friday 2026'
    })
    @IsString()
    @IsNotEmpty()
    name: string;
}

export class EmailCampaignQuery {
    @ApiPropertyOptional({
        description: 'Número da página',
        example: '1',
        default: '1'
    })
    @IsNumberString()
    @IsOptional()
    page: string;

    @ApiPropertyOptional({
        description: 'Limite de itens por página',
        example: '30',
        default: '30'
    })
    @IsNumberString()
    @IsOptional()
    limit: string;
}

export default class UpdateCampaignBatchSizeDTO {
    @ApiProperty({
        description: 'Tamanho do batch da campanha (mínimo 100)',
        example: 500,
        minimum: 100
    })
    @IsNumber()
    @IsPositive()
    @Min(100)
    campaign_batch_size: number;
}

export class UpdateCopyVariantDTO {
    @ApiProperty({
        description: 'Tipo de variação de copy',
        enum: ECopyVariationType,
        example: ECopyVariationType.ai
    })
    @IsEnum(ECopyVariationType)
    copy_variation_type: ECopyVariationType;
}

export class CreatePrimaryCopyVariantDTO {
    @ApiProperty({
        description: 'Conteúdo HTML do email (validado contra XSS)',
        example: '<h1>Promoção {{discount}}% OFF</h1><p>Olá {{name}}, aproveite!</p>'
    })
    @IsString()
    @NoXSS({ message: 'HTML contém possíveis scripts maliciosos (XSS)' })
    html: string;

    @ApiProperty({
        description: 'Conteúdo Markdown do email (validado contra XSS)',
        example: '# Promoção {{discount}}% OFF\n\nOlá {{name}}, aproveite!'
    })
    @IsString()
    @NoXSS({ message: 'Markdown contém possíveis scripts maliciosos (XSS)' })
    md: string;

    @ApiProperty({
        description: 'Assunto do email',
        example: 'Black Friday: 50% OFF em todos os planos!'
    })
    @IsString()
    subject: string;

    @ApiProperty({
        description: 'Nome do remetente',
        example: 'Equipe Zarp'
    })
    @IsString()
    from_name: string;

    @ApiPropertyOptional({
        description: 'Pré-header do email (texto visvel na prévia)',
        example: 'Não perca essa oportunidade!'
    })
    @IsString()
    @IsOptional()
    pre_header: string;

    @ApiProperty({
        description: 'Usar header padrão do template',
        example: true
    })
    @IsBoolean()
    use_header: boolean;

    @ApiProperty({
        description: 'Usar footer padrão do template',
        example: true
    })
    @IsBoolean()
    use_footer: boolean;
}

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
                }
            },
        });
    };
} 