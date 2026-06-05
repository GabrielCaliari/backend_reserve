import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateModuleSettingsDto {
  // { [key]: value } — per-key validation happens against the registry in SettingsService.set
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description:
      'Partial map of setting key (camelCase) to new value. Only provided keys are written. ' +
      'Unknown keys → 400, superadmin-scoped keys → 403 (tenant route only).',
    example: { emailEnabled: false, contactEmail: 'ops@example.com' },
  })
  @IsObject()
  values: Record<string, unknown>;
}
