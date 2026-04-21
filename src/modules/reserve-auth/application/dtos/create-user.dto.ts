import {
    IsString,
    IsNotEmpty,
    IsEmail,
    Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsCPF } from '../../../../shared/validators/is-cpf.validator';
import { IsStrongPassword } from '../../../../shared/validators';

export default class CreateUserDTO {
    @ApiProperty({ description: 'Full name (min 2 words, letters only)', example: 'John Doe' })
    @IsString()
    @IsNotEmpty()
    @Matches(/^[A-Za-zÀ-ÖØ-öø-ÿÁ-úçÇ]{2,}(?: [A-Za-zÀ-ÖØ-öø-ÿÁ-úçÇ]{2,})*$/)
    name: string;

    @ApiProperty({ description: 'User email address', example: 'user@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ description: 'Phone number', example: '11999999999' })
    @IsString()
    phone_number: string;

    @ApiProperty({ description: 'CPF (Brazilian tax ID)', example: '12345678901' })
    @IsCPF()
    cpf: string;

    @ApiProperty({ description: 'Senha (mínimo 10 caracteres, com maiúscula, minúscula, número e símbolo)', example: 'Str0ng!Pass', minLength: 10 })
    @IsString()
    @IsNotEmpty()
    @IsStrongPassword()
    password: string;
}
