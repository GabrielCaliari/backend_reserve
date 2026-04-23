import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export default class AuthUserDTO {
    @ApiProperty({ description: 'User email', example: 'user@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ description: 'User password', example: 'Str0ng!Pass' })
    @IsString()
    @IsNotEmpty()
    password: string;
}
