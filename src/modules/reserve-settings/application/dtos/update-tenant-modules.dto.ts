import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTenantModulesDto {
  // { [gateableModule]: boolean } — names validated against the catalog in ModuleFlagsService
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'boolean' },
    description: 'Partial map of gateable module name to enabled flag. Unknown module names → 400.',
    example: { mailer: true, cms: false },
  })
  @IsObject()
  modules: Record<string, boolean>;
}
