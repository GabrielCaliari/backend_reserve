import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const mediaAssetCuidExample = 'cmcmsasset01abc234def56789';

export class CreateAuthorDTO {
  @ApiProperty({
    description: 'Author first name',
    example: 'John',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({
    description: 'Author last name',
    example: 'Doe',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({
    description: 'Author biography',
    example: 'John is a software engineer with 10 years of experience...',
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

  tenantId?: string;
}
