import { ESMTPProvider } from '../../domain/enums/smtp-provider.enum';
import { IsBoolean, IsEmail, IsEnum, IsObject, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateSmtpServerDTO {
    @ApiProperty({
        description: 'SMTP server name',
        example: 'Main Zarp Server'
    })
    @IsString()
    name: string;

    @ApiProperty({
        description: 'Email associated with the SMTP server',
        example: 'noreply@zarp.com.br'
    })
    @IsString()
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'SMTP provider type',
        enum: ESMTPProvider,
        example: ESMTPProvider.smtp
    })
    @IsEnum(ESMTPProvider)
    provider: ESMTPProvider;

    @ApiPropertyOptional({
        description: 'Set as default server',
        example: false,
        default: false
    })
    @IsOptional()
    @IsBoolean()
    default: boolean;

    @ApiPropertyOptional({
        description: 'SMTP settings (required if provider is SMTP)',
        example: {
            host: 'smtp.gmail.com',
            port: '587',
            username: 'user@gmail.com',
            password: 'password123'
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
        description: 'API settings (required if provider uses API)',
        example: {
            access_token: 'access_token_value',
            private_token: 'private_token_value',
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