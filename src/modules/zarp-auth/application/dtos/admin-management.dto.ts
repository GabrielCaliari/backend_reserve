import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsEmail } from 'class-validator';
import { EAdminRole } from '../../domain/enums/admin-role.enum';

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
    default: EAdminRole.company_admin,
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
}

export class AdminResponseDTO {
  @ApiProperty({ example: 1 })
  id: number;

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
    id: number;
    name: string;
    slug: string;
    domain?: string;
    role?: EAdminRole;
  }>;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  created_at: Date;
}

export class AdminListItemDTO {
  @ApiProperty({ example: 1 })
  id: number;

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
    id: number;
    name: string;
    slug: string;
  }>;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  created_at: Date;
}
