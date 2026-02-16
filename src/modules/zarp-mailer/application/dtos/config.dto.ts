import { ESMTPProvider } from "@/@types/@smtp-server";
import { IsBoolean, IsEmail, IsEnum, IsObject, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateSmtpServerDTO {
    @ApiProperty({
        description: 'Nome do servidor SMTP',
        example: 'Servidor Principal Zarp'
    })
    @IsString()
    name: string;

    @ApiProperty({
        description: 'Email associado ao servidor SMTP',
        example: 'noreply@zarp.com.br'
    })
    @IsString()
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'Provedor SMTP',
        enum: ESMTPProvider,
        example: ESMTPProvider.smtp
    })
    @IsEnum(ESMTPProvider)
    provider: ESMTPProvider;

    @ApiPropertyOptional({
        description: 'Definir como servidor padrão',
        example: false,
        default: false
    })
    @IsOptional()
    @IsBoolean()
    default: boolean;

    @ApiPropertyOptional({
        description: 'Configurações SMTP (necessário se provider for SMTP)',
        example: {
            host: 'smtp.gmail.com',
            port: '587',
            username: 'user@gmail.com',
            password: 'senha123'
        }
    })
    @IsOptional()
    @IsObject()
    smtp: {
        host: string;
        port: string;
        username: string;
        password: string;
    }

    @ApiPropertyOptional({
        description: 'Configurações de API (necessário se provider usar API)',
        example: {
            access_token: 'token_acesso',
            private_token: 'token_privado',
            region: 'us-east-1'
        }
    })
    @IsOptional()
    @IsObject()
    api: {
        access_token: string;
        private_token: string;
        region?: string;
    }
}