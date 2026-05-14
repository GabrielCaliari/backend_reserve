import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsEmail, MinLength } from 'class-validator';
import { EAdminRole } from '../../domain/enums/admin-role.enum';

const adminCuidExample = 'cma1admin0001ghijklmno23p';
const tenantCuidExample = 'cma1tenant001uvwxyzab345';

export class CreateAdminDTO {
  @ApiProperty({ description: 'Administrator name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Administrator email', example: 'john@company.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Administrator password', example: 'Str0ng!Pass' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({
    description: 'Administrator role',
    enum: EAdminRole,
    default: EAdminRole.manager,
  })
  @IsEnum(EAdminRole)
  @IsOptional()
  role?: EAdminRole;
}

export class UpdateAdminRoleDTO {
  @ApiProperty({ description: 'New role', enum: EAdminRole })
  @IsEnum(EAdminRole)
  @IsNotEmpty()
  role: EAdminRole;
}

export class UpdateAdminDTO {
  @ApiPropertyOptional({ description: 'Administrator name', example: 'John Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Administrator email', example: 'john@company.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Administrator password (super_admin only)', example: 'Str0ng!Pass' })
  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;
}

export class AdminResponseDTO {
  @ApiProperty({ example: adminCuidExample, description: 'Admin CUID (25-character identifier)' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'john@company.com' })
  email: string;

  @ApiProperty({ enum: EAdminRole, example: EAdminRole.super_admin })
  role: EAdminRole;

  @ApiProperty({ example: true })
  active: boolean;

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  tenants: Array<{
    id: string;
    name: string;
    slug: string;
    domain?: string;
    role?: EAdminRole;
  }>;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  created_at: Date;
}

export class AdminListItemDTO {
  @ApiProperty({ example: adminCuidExample, description: 'Admin CUID (25-character identifier)' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'john@company.com' })
  email: string;

  @ApiProperty({ enum: EAdminRole, example: EAdminRole.manager })
  role: EAdminRole;

  @ApiProperty({ example: true })
  active: boolean;

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  tenants: Array<{
    id: string;
    name: string;
    slug: string;
  }>;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  created_at: Date;
}
