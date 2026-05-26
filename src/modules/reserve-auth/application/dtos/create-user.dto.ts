import {
    IsString,
    IsNotEmpty,
    IsEmail,
    Matches,
    MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsCPF } from '../../../../shared/validators/is-cpf.validator';

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

    @ApiProperty({ description: 'Password (min 6 characters)', example: 'Str0ng!Pass', minLength: 6 })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;
}
