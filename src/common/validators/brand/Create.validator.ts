import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export default class CreateValidator {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    identifier?: string;

    @IsString()
    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
    phone_number: string;

    @IsString()
    @IsOptional()
    inpi_number?: string;
}