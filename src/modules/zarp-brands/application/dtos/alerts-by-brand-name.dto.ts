import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export default class AlertsByBrandNameDTO {
    @ApiProperty({ description: 'Brand ID', example: 1 })
    @IsString()
    @IsNotEmpty()
    brand_id: string;
}
