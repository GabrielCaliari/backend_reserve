import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export const TENANT_DOMAIN_TYPES = ['domain', 'regex'] as const;
export type TenantDomainType = (typeof TENANT_DOMAIN_TYPES)[number];

export class CreateTenantDomainDto {
  @ApiPropertyOptional({
    enum: TENANT_DOMAIN_TYPES,
    default: 'domain',
    description:
      '"domain" auto-scopes to the host and its subdomains (https only). "regex" is matched against Origin verbatim.',
  })
  @IsOptional()
  @IsIn(TENANT_DOMAIN_TYPES)
  type?: TenantDomainType;

  @ApiProperty({
    example: 'hotelacme.com.br',
    description: 'Bare host for type=domain, or a regex source (must compile) for type=regex',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  value: string;

  @ApiPropertyOptional({ default: false, description: 'Demotes any other primary row for the same tenant' })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;
}

export class UpdateTenantDomainDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Setting true demotes any other primary row for the same tenant' })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;
}

export class TenantDomainResponseDto {
  @ApiProperty({ example: 'cma1domain001uvwxyzab345' })
  id: string;

  @ApiProperty({ example: 'cma1tenant001uvwxyzab345' })
  tenant_id: string;

  @ApiProperty({ enum: TENANT_DOMAIN_TYPES, example: 'domain' })
  type: TenantDomainType;

  @ApiProperty({ example: 'hotelacme.com.br' })
  value: string;

  @ApiProperty({ example: true })
  is_primary: boolean;

  @ApiProperty({ example: true })
  active: boolean;

  @ApiProperty({ example: '2026-07-26T12:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2026-07-26T12:00:00.000Z' })
  updated_at: Date;
}
