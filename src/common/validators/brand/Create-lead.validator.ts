import { IsString, IsNotEmpty, IsEmail, IsEnum, IsOptional, Matches } from "class-validator";
import { ECompanySize, EOriginLead } from "src/@types/@lead";

export default class CreateLeadValidator {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    @Matches(/^[0-9]{11}$/, {
        message: 'Phone number must be exactly 11 digits'
    })
    phone_number: string;

    @IsString()
    @IsOptional()
    brand?: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsEnum(ECompanySize)
    @IsOptional()
    company_size?: ECompanySize;

    @IsString()
    @IsOptional()
    company_segment?: string;

    @IsString()
    @IsOptional()
    company_on_market?: string;

    @IsString()
    @IsOptional()
    website?: string;

    @IsEnum(EOriginLead)
    @IsNotEmpty()
    origin: EOriginLead;

    @IsString()
    @IsOptional()
    origin_font: string;
}