import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, Matches, MaxLength } from 'class-validator';

export class CreateTenantDTO {
  @ApiProperty({ description: 'Tenant company name', example: 'Acme Corp' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Unique URL-friendly slug', example: 'acme-corp' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase alphanumeric with hyphens only',
  })
  slug: string;

  @ApiPropertyOptional({ description: 'Tenant custom domain', example: 'admin.acme.com' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  domain?: string;
}

export class UpdateTenantDTO {
  @ApiPropertyOptional({ description: 'Tenant company name', example: 'Acme Corp Updated' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Unique URL-friendly slug', example: 'acme-corp-v2' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase alphanumeric with hyphens only',
  })
  slug?: string;

  @ApiPropertyOptional({ description: 'Tenant custom domain', example: 'admin.acme.com' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  domain?: string;
}

export class AssignAdminToTenantDTO {
  @ApiProperty({ description: 'Admin ID to assign', example: 1 })
  @IsNotEmpty()
  admin_id: number;

  @ApiProperty({ description: 'Tenant ID to assign to', example: 1 })
  @IsNotEmpty()
  tenant_id: number;
}
