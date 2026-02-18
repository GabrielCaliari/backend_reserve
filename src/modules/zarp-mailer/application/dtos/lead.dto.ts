import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsNumber, IsNumberString, IsObject, IsOptional, IsString } from "class-validator";
import { EOriginLead } from '../../../zarp-auth/domain/entities/lead.entity';
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateLead {
    @ApiPropertyOptional({
        description: 'Lead name',
        example: 'John Smith'
    })
    @IsString()
    @IsOptional()
    name?: string;
    
    @ApiPropertyOptional({
        description: 'Lead email address',
        example: 'john.smith@email.com'
    })
    @IsString()
    @IsEmail()
    @IsOptional()
    email?: string;
    
    @ApiPropertyOptional({
        description: 'Lead phone number',
        example: '11999999999'
    })
    @IsString()
    @IsOptional()
    phone_number?: string;
    
    @ApiPropertyOptional({
        description: 'Lead origin',
        enum: EOriginLead,
        example: EOriginLead.page
    })
    @IsEnum(EOriginLead)
    @IsOptional()
    origin?: EOriginLead;
    
    @ApiPropertyOptional({
        description: 'Lead origin source',
        example: 'Google Ads'
    })
    @IsString()
    @IsOptional()
    origin_font?: string;
    
    @ApiPropertyOptional({
        description: 'Description or notes about the lead',
        example: 'Lead interested in enterprise plans'
    })
    @IsString()
    @IsOptional()
    description: string;
    
    @ApiProperty({
        description: 'Additional lead data in JSON format',
        example: { interest: 'premium-plan', campaign_source: 'black-friday' }
    })
    @IsObject()
    data: {};
}

export class LeadQuery {
    @ApiPropertyOptional({
        description: 'Page number',
        example: '1',
        default: '1'
    })
    @IsNumberString()
    @IsOptional()
    page: string;

    @ApiPropertyOptional({
        description: 'Items per page',
        example: '30',
        default: '30'
    })
    @IsNumberString()
    @IsOptional()
    limit: string;
}