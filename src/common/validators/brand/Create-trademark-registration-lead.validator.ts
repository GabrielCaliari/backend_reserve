import { IsString, IsNotEmpty, IsEmail, IsEnum, IsOptional } from "class-validator";
import { ECompanySize } from "src/@types/@trademark-registration-lead";

export default class CreateTrademarkRegistrationLeadValidator {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
    phone_number: string;

    @IsString()
    @IsNotEmpty()
    brand: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsEnum(ECompanySize)
    company_size: ECompanySize;

    @IsString()
    @IsNotEmpty()
    company_segment: string;

    @IsString()
    @IsNotEmpty()
    company_on_market: string;

    @IsString()
    @IsOptional()
    website?: string;
}