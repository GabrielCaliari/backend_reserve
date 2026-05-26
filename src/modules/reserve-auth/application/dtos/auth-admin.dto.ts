import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';

export default class AuthAdminDTO {
    @ApiProperty({ description: 'Administrator email', example: 'admin@Reserve.com.br' })
    @IsEmail({}, { message: 'Email inválido' })
    @IsNotEmpty({ message: 'Email é obrigatório' })
    email: string;

    @ApiProperty({ description: 'Administrator password', example: 'senha123' })
    @IsString()
    @IsNotEmpty({ message: 'Senha é obrigatória' })
    @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
    password: string;
}

export interface IValidateAdminToken {
    'session-id': string;
    token: string;
}
