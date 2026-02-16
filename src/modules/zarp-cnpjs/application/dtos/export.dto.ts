import { IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export default class ExportDTO {
    @ApiProperty({ description: 'Starting row index for the export', example: 0 })
    @IsInt()
    @IsNotEmpty()
    start: number;
}
