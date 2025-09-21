import { ESMTPProvider } from "src/@types/@smtp-server";
import { IsBoolean, IsEmail, IsEnum, IsObject, IsOptional, IsString } from "class-validator";

export class CreateSmtpServerDTO {
    @IsString()
    name: string;

    @IsString()
    @IsEmail()
    email: string;

    @IsEnum(ESMTPProvider)
    provider: ESMTPProvider;

    @IsOptional()
    @IsBoolean()
    default: boolean;

    @IsOptional()
    @IsObject()
    smtp: {
        host: string;
        port: string;
        username: string;
        password: string;
    }

    @IsOptional()
    @IsObject()
    api: {
        access_token: string;
        private_token: string;
        region?: string;
    }
}