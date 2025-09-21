import { IsString, IsNotEmpty, IsArray, ValidationArguments, IsEnum, ValidationOptions, registerDecorator, IsNumber, IsPositive, Min, IsBoolean, IsOptional, IsNumberString } from 'class-validator';
import { ECopyVariationType } from 'src/@types/@Email-campaign';

export class CreateEmailCampaignDTO {
    @IsString()
    @IsNotEmpty()
    name: string;
}

export class EmailCampaignQuery {
    @IsNumberString()
    @IsOptional()
    page: string;

    @IsNumberString()
    @IsOptional()
    limit: string;
}

export default class UpdateCampaignBatchSizeDTO {
    @IsNumber()
    @IsPositive()
    @Min(100)
    campaign_batch_size: number;
}

export class UpdateCopyVariantDTO {
    @IsEnum(ECopyVariationType)
    copy_variation_type: ECopyVariationType;
}

export class CreatePrimaryCopyVariantDTO {
    @IsString()
    @NoXSS({ message: 'HTML contém possíveis scripts maliciosos (XSS)' })
    html: string;

    @IsString()
    @NoXSS({ message: 'Markdown contém possíveis scripts maliciosos (XSS)' })
    md: string;

    @IsString()
    subject: string;

    @IsString()
    from_name: string;

    @IsString()
    @IsOptional()
    pre_header: string;

    @IsBoolean()
    use_header: boolean;

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