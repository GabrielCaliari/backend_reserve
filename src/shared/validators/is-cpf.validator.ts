import {
    ValidatorConstraint,
    ValidatorConstraintInterface,
    ValidationOptions,
    registerDecorator,
} from 'class-validator';
import { isValidCPF } from '../helpers';

@ValidatorConstraint({ async: false })
export class IsCPFConstraint implements ValidatorConstraintInterface {
    validate(cpf: string): boolean {
        return isValidCPF(cpf);
    }

    defaultMessage(): string {
        return 'CPF is invalid';
    }
}

export function IsCPF(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsCPFConstraint,
        });
    };
}
