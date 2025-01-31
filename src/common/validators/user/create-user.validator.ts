import {
    IsString,
    IsNotEmpty,
    IsEmail,
    Matches,
    MinLength,
    IsDateString,
    IsEnum,
} from 'class-validator';
import { IsCPF } from '../IsCPF';

export default class CreateUserValidator {
    @IsString()
    @IsNotEmpty()
    @Matches(/^[A-Za-zÀ-ÖØ-öø-ÿÁ-úçÇ]{2,}(?: [A-Za-zÀ-ÖØ-öø-ÿÁ-úçÇ]{2,})*$/)
    name: string;

    @IsEmail()
    email: string;

    @IsString()
    phone_number: string;

    @IsCPF()
    cpf: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;

    // @IsDateString({ strict: true }, { message: 'date_of_birth must be in a valid date format (YYYY-MM-DD)' })
    // date_of_birth: Date;

    // @IsEnum({
    //     female: '1',
    //     male: '2'
    // })
    // sex: '1' | '2';
}