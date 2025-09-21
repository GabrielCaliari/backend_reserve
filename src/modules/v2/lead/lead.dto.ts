import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsNumber, IsNumberString, IsObject, IsOptional, IsString } from "class-validator";
import { EOriginLead } from "src/core/classes/models/Lead";

export class CreateLead {
    @IsString()
    @IsOptional()
    name?: string;
    
    @IsString()
    @IsEmail()
    @IsOptional()
    email?: string;
    
    @IsString()
    @IsOptional()
    phone_number?: string;
    
    @IsEnum(EOriginLead)
    @IsOptional()
    origin?: EOriginLead;
    
    @IsString()
    @IsOptional()
    origin_font?: string;
    
    @IsString()
    @IsOptional()
    description: string;
    
    @IsObject()
    data: {};
}

export class LeadQuery {
    @IsNumberString()
    @IsOptional()
    page: string;

    @IsNumberString()
    @IsOptional()
    limit: string;
}