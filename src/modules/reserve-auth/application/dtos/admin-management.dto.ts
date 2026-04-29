import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsEmail, MaxLength } from 'class-validator';
import { IsStrongPassword } from '../../../../shared/validators';
import { EAdminRole } from '../../domain/enums/admin-role.enum';

const adminCuidExample = 'cma1admin0001ghijklmno23p';

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
  @IsStrongPassword()
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
  @IsStrongPassword()
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

  @ApiPropertyOptional({ example: true })
  scheduled_for_deletion?: boolean;

  @ApiPropertyOptional({ example: '2026-05-21T12:00:00.000Z', nullable: true })
  deletion_scheduled_for_at?: Date | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  created_at: Date;
}

export class ScheduleAdminDeletionDTO {
  @ApiPropertyOptional({
    description: 'Optional reason for scheduling admin deletion',
    example: 'Admin no longer with the company',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  reason?: string;
}

export class AdminDeletionStatusDTO {
  @ApiProperty({ example: adminCuidExample, description: 'Admin CUID (25-character identifier)' })
  id: string;

  @ApiProperty({ example: false })
  active: boolean;

  @ApiProperty({ example: true })
  scheduled_for_deletion: boolean;

  @ApiPropertyOptional({ example: '2026-05-14T12:00:00.000Z', nullable: true })
  archived_at?: Date | null;

  @ApiPropertyOptional({ example: '2026-05-14T12:00:00.000Z', nullable: true })
  deletion_requested_at?: Date | null;

  @ApiPropertyOptional({ example: '2026-05-21T12:00:00.000Z', nullable: true })
  deletion_scheduled_for_at?: Date | null;

  @ApiPropertyOptional({ example: adminCuidExample, nullable: true })
  deletion_requested_by?: string | null;

  @ApiPropertyOptional({ example: 'Admin no longer with the company', nullable: true })
  deletion_reason?: string | null;
}
