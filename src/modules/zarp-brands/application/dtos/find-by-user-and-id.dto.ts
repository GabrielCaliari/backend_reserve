import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export default class FindByUserAndIdDTO {
    @ApiProperty({ description: 'Brand analysis ID', example: '1' })
    @IsString()
    @IsNotEmpty()
    id: string;
}
