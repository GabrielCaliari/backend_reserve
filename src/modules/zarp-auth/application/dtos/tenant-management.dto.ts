import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, Matches, MaxLength, IsEnum } from 'class-validator';
import { EAdminRole } from '../../domain/enums/admin-role.enum';

const adminCuidExample = 'cma1admin0001ghijklmno23p';
const tenantCuidExample = 'cma1tenant001uvwxyzab345';

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

  @ApiPropertyOptional({ description: 'Unique URL-friendly slug', example: 'acme-corp-new' })
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

export class ScheduleTenantDeletionDTO {
  @ApiPropertyOptional({
    description: 'Optional reason for scheduling tenant deletion',
    example: 'Customer requested account closure',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  reason?: string;
}

export class AssignAdminToTenantDTO {
  @ApiProperty({ description: 'Admin CUID to assign', example: adminCuidExample })
  @IsNotEmpty()
  @Matches(/^c[a-z0-9]{24}$/, { message: 'admin_id must be a valid CUID' })
  admin_id: string;

  @ApiProperty({ description: 'Tenant CUID to assign to', example: tenantCuidExample })
  @IsNotEmpty()
  @Matches(/^c[a-z0-9]{24}$/, { message: 'tenant_id must be a valid CUID' })
  tenant_id: string;
}

export class UpdateAdminTenantRoleDTO {
  @ApiProperty({ description: 'New role for admin in tenant', enum: [EAdminRole.owner, EAdminRole.manager, EAdminRole.editor, EAdminRole.viewer] })
  @IsNotEmpty()
  @IsEnum(EAdminRole)
  role: EAdminRole;
}

export class TenantResponseDTO {
  @ApiProperty({ example: tenantCuidExample, description: 'Tenant CUID (25-character identifier)' })
  id: string;

  @ApiProperty({ example: 'Acme Corp' })
  name: string;

  @ApiProperty({ example: 'acme-corp' })
  slug: string;

  @ApiProperty({ example: 'admin.acme.com', nullable: true })
  domain?: string;

  @ApiProperty({ example: true })
  active: boolean;

  @ApiPropertyOptional({ example: '2026-03-08T12:00:00.000Z', nullable: true })
  archived_at?: Date | null;

  @ApiPropertyOptional({ example: '2026-03-08T12:00:00.000Z', nullable: true })
  deletion_requested_at?: Date | null;

  @ApiPropertyOptional({ example: '2026-03-23T12:00:00.000Z', nullable: true })
  deletion_scheduled_for_at?: Date | null;

  @ApiPropertyOptional({ example: adminCuidExample, nullable: true })
  deletion_requested_by?: string | null;

  @ApiPropertyOptional({ example: 'Customer requested account closure', nullable: true })
  deletion_reason?: string | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updated_at: Date;
}

export class TenantWithAdminsDTO extends TenantResponseDTO {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  AdminTenant: Array<{
    Admin: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  }>;
}

export class TenantDeletionStatusDTO {
  @ApiProperty({ example: tenantCuidExample, description: 'Tenant CUID (25-character identifier)' })
  id: string;

  @ApiProperty({ example: false })
  active: boolean;

  @ApiProperty({ example: true })
  scheduled_for_deletion: boolean;

  @ApiPropertyOptional({ example: '2026-03-08T12:00:00.000Z', nullable: true })
  archived_at?: Date | null;

  @ApiPropertyOptional({ example: '2026-03-08T12:00:00.000Z', nullable: true })
  deletion_requested_at?: Date | null;

  @ApiPropertyOptional({ example: '2026-03-23T12:00:00.000Z', nullable: true })
  deletion_scheduled_for_at?: Date | null;

  @ApiPropertyOptional({ example: adminCuidExample, nullable: true })
  deletion_requested_by?: string | null;

  @ApiPropertyOptional({ example: 'Customer requested account closure', nullable: true })
  deletion_reason?: string | null;
}
