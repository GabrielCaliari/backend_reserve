import { IsBoolean, IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export default class PublicBrandFindDTO {
    @ApiProperty({ description: 'Full name (letters only, min 2 words)', example: 'John Doe' })
    @IsString()
    @IsNotEmpty()
    @Matches(/^[A-Za-z\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff\u00c1-\u00fa\u00e7\u00c7]{2,}(?: [A-Za-z\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff\u00c1-\u00fa\u00e7\u00c7]{2,})*$/)
    name: string;

    @ApiProperty({ description: 'Contact email', example: 'user@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ description: 'Search for radical marks', example: true })
    @IsBoolean()
    radical: boolean;

    @ApiProperty({ description: 'Include international marks', example: false })
    @IsBoolean()
    international: boolean;
}
