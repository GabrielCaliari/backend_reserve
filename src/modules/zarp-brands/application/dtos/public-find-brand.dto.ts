import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export default class PublicFindBrandDTO {
    @ApiProperty({ description: 'Brand name to search', example: 'Zarp' })
    @IsString()
    @IsNotEmpty()
    brand_name: string;
}
