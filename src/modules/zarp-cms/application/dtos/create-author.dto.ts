import { IsString, IsNotEmpty, MaxLength, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
    description: 'Avatar MediaAsset ID (UUID)',
    example: 'ckl1234abcd5',
  })
  @IsString()
  @IsOptional()
  avatarId?: string;

  @ApiProperty({
    description: 'Tenant ID',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  tenantId: string;
}
