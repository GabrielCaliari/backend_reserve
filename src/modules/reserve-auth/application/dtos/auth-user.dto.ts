import { ApiProperty } from '@nestjs/swagger';

export default class AuthUserDTO {
    @ApiProperty({ description: 'User email', example: 'user@example.com' })
    email: string;

    @ApiProperty({ description: 'User password', example: 'Str0ng!Pass' })
    password: string;
}
