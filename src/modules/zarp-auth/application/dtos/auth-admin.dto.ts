import { ApiProperty } from '@nestjs/swagger';

export default class AuthAdminDTO {
    @ApiProperty({ description: 'Administrator email', example: 'admin@zarp.com.br' })
    email: string;

    @ApiProperty({ description: 'Administrator password', example: 'senha123' })
    password: string;
}

export interface IValidateAdminToken {
    'session-id': string;
    token: string;
}
