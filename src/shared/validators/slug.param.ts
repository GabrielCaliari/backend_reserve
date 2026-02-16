import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SlugParam {
    @ApiProperty({ description: 'URL-friendly slug identifier', example: 'my-post-title' })
    @IsString()
    @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: 'Slug must be in valid format (lowercase letters, numbers, and hyphens only)',
    })
    slug: string;
}
