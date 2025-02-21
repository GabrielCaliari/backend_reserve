import { IsString, Matches } from 'class-validator';

export class SlugParam {
    @IsString()
    @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: 'Slug must be in valid format (lowercase letters, numbers, and hyphens only)',
    })
    slug: string;
}