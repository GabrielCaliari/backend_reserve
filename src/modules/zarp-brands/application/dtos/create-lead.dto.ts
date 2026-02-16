import { IsString, IsNotEmpty, IsEnum, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ECompanySize, EOriginLead } from '@/modules/zarp-leads/domain/enums/lead.enum';

export default class CreateLeadDTO {
    @ApiProperty({ description: 'Lead full name', example: 'John Doe' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: 'Phone number (exactly 11 digits)', example: '11999999999' })
    @IsString()
    @IsNotEmpty()
    @Matches(/^[0-9]{11}$/, {
        message: 'Phone number must be exactly 11 digits'
    })
    phone_number: string;

    @ApiPropertyOptional({ description: 'Brand name (optional)', example: 'Zarp' })
    @IsString()
    @IsOptional()
    brand?: string;

    @ApiProperty({ description: 'Lead description or notes', example: 'Interested in premium plans' })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiPropertyOptional({ description: 'Company size', enum: ECompanySize })
    @IsEnum(ECompanySize)
    @IsOptional()
    company_size?: ECompanySize;

    @ApiPropertyOptional({ description: 'Company segment', example: 'Technology' })
    @IsString()
    @IsOptional()
    company_segment?: string;

    @ApiPropertyOptional({ description: 'Time on market', example: '5 years' })
    @IsString()
    @IsOptional()
    company_on_market?: string;

    @ApiPropertyOptional({ description: 'Company website URL', example: 'https://zarp.com.br' })
    @IsString()
    @IsOptional()
    website?: string;

    @ApiProperty({ description: 'Lead origin', enum: EOriginLead })
    @IsEnum(EOriginLead)
    @IsNotEmpty()
    origin: EOriginLead;

    @ApiPropertyOptional({ description: 'Origin source detail', example: 'Google Ads' })
    @IsString()
    @IsOptional()
    origin_font: string;
}
