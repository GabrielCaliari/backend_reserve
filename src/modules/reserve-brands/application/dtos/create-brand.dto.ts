import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export default class CreateBrandDTO {
    @ApiProperty({ description: 'Brand name', example: 'Reserve Solutions' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ description: 'Brand identifier (optional)', example: 'reserve-solutions' })
    @IsString()
    @IsOptional()
    identifier?: string;

    @ApiProperty({ description: 'Contact email', example: 'contact@Reserve.com.br' })
    @IsString()
    @IsEmail()
    email: string;

    @ApiProperty({ description: 'Contact phone number', example: '11999999999' })
    @IsString()
    @IsNotEmpty()
    phone_number: string;

    @ApiPropertyOptional({ description: 'INPI registration number (optional)', example: '123456789' })
    @IsString()
    @IsOptional()
    inpi_number?: string;
}
