import { ApiProperty } from '@nestjs/swagger';
import { EAdminRole } from '../../domain/enums/admin-role.enum';

export class TenantCapabilitiesResponseDto {
  @ApiProperty({ example: 'ckt1234567890abcdefghijk' })
  tenantId: string;

  @ApiProperty({ enum: EAdminRole, example: EAdminRole.manager })
  role: EAdminRole;

  @ApiProperty({ type: [String], example: ['leads.read', 'leads.update'] })
  permissions: string[];
}
