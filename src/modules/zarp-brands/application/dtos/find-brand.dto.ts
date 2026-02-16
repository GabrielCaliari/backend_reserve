import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export default class FindBrandDTO {
    @ApiProperty({ description: 'Brand ID', example: '1' })
    @IsString()
    @IsNotEmpty()
    brand_id: string;
}
