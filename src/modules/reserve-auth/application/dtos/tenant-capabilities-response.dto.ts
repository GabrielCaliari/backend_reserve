import { ApiProperty } from '@nestjs/swagger';
import { GATEABLE_MODULES } from '../../../../shared/auth/constants/gateable-modules';
import { TENANT_TYPES } from '../../../../shared/auth/constants/tenant-type';

export class ModuleResolutionResponseDto {
  @ApiProperty({ example: true })
  enabled!: boolean;

  @ApiProperty({ enum: ['master', 'tenantOverride', 'tenantTypePolicy'], example: 'tenantTypePolicy' })
  source!: 'master' | 'tenantOverride' | 'tenantTypePolicy';
}

export class TenantCapabilitiesResponseDto {
  @ApiProperty({ example: 'cma1tenant001uvwxyzab345' })
  tenantId!: string;

  @ApiProperty({ enum: TENANT_TYPES, example: 'COMMON' })
  tenantType!: (typeof TENANT_TYPES)[number];

  @ApiProperty({ example: false })
  isMasterTenant!: boolean;

  @ApiProperty({ example: 'manager' })
  role!: string;

  @ApiProperty({
    description: 'Resolved enabled/source per gateable module',
    type: 'object',
    additionalProperties: { $ref: '#/components/schemas/ModuleResolutionResponseDto' },
    example: Object.fromEntries(GATEABLE_MODULES.map((module) => [module, { enabled: true, source: 'tenantTypePolicy' }])),
  })
  modules!: Record<string, ModuleResolutionResponseDto>;

  @ApiProperty({ type: [String], example: ['stats.dashboard.read', 'leads.read'] })
  permissions!: string[];
}
