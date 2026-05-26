import { IsString, IsOptional, MaxLength, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const mediaAssetCuidExample = 'cmcmsasset01abc234def56789';

export class UpdateAuthorDTO {
  @ApiPropertyOptional({
    description: 'Author first name',
    example: 'John',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Author last name',
    example: 'Doe',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Author biography',
    example: 'Updated biography...',
  })
  @IsString()
  @IsOptional()
  biography?: string;

  @ApiPropertyOptional({
    description: 'Avatar MediaAsset ID (CUID de 25 caracteres)',
    example: mediaAssetCuidExample,
  })
  @IsString()
  @IsOptional()
  avatarId?: string;

  @ApiPropertyOptional({
    description: 'Active status',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
