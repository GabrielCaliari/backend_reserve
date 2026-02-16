import { ApiProperty } from '@nestjs/swagger';

export default class IAuthAdminValidator {
    @ApiProperty({
        description: 'Email do administrador',
        example: 'admin@zarp.com.br'
    })
    email: string;

    @ApiProperty({
        description: 'Senha do administrador',
        example: 'senha123'
    })
    password: string;
}

export interface IValidateAdminToken {
    'session-id': number;
    token: string;
}