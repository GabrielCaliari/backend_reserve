import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';

const MIN_LENGTH = 10;
const HAS_UPPERCASE = /[A-Z]/;
const HAS_LOWERCASE = /[a-z]/;
const HAS_DIGIT = /[0-9]/;
const HAS_SYMBOL = /[^A-Za-z0-9]/;

/**
 * Substitui @MinLength(6)/@MinLength(8) em campo de senha: exige 10+
 * caracteres com ao menos uma maiúscula, uma minúscula, um dígito e um
 * símbolo. Não verifica senha vazada — isso é escopo de outra fase.
 */
@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;

    return (
      value.length >= MIN_LENGTH &&
      HAS_UPPERCASE.test(value) &&
      HAS_LOWERCASE.test(value) &&
      HAS_DIGIT.test(value) &&
      HAS_SYMBOL.test(value)
    );
  }

  defaultMessage(): string {
    return `A senha precisa ter no mínimo ${MIN_LENGTH} caracteres, com pelo menos uma letra maiúscula, uma minúscula, um número e um símbolo.`;
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}
