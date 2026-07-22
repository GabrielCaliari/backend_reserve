import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export default class GenerateImageDTO {
    @ApiProperty({ description: 'Prompt used to generate the image', example: 'A futuristic city skyline at sunset' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(2000)
    prompt: string;
}
