import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export default class IdValidator {
    @ApiProperty({ description: 'Resource numeric ID', example: '1' })
    @IsNotEmpty({ message: 'ID is required' })
    @IsString({ message: 'ID must be a string' })
    @Matches(/^\d+$/, { message: 'ID must be a numeric string' })
    id: string;
}
