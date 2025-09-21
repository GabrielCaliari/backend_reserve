import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

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