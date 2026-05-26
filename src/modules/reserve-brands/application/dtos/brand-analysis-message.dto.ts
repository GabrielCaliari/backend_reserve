import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export default class BrandAnalysisMessageDTO {
    @ApiProperty({ description: 'Brand name to analyze', example: 'Reserve Solutions' })
    @IsString()
    @IsNotEmpty()
    brand: string;

    @ApiProperty({ description: 'Market niche or segment', example: 'Technology' })
    @IsString()
    @IsNotEmpty()
    niche: string;

    @ApiProperty({ description: 'Brand description', example: 'A SaaS platform for trademark registration' })
    @IsString()
    @IsNotEmpty()
    description: string;
}
