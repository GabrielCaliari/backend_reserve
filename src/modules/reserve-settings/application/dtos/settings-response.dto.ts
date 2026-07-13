import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger response models for the settings API. These classes exist purely so
 * the OpenAPI document exposes typed responses instead of `unknown`; the
 * runtime shapes are produced by `ModuleFlagsService` and `SettingsService`.
 * Keep them in lockstep with `GATEABLE_MODULES` and the `SettingsRegistry`
 * definitions.
 *
 * `getFlags`/`getModule`/`describeAll` all return bare dynamic maps (not
 * wrapped in an envelope object) — each module registers its own set of keys
 * (see `settings-registry.ts`), so the per-key value/shape cannot be fixed at
 * the type level. They are documented via inline `schema` on `@ApiOkResponse`
 * with `additionalProperties`, matching the wire shape exactly.
 */
export class SettingDescriptorResponseDto {
  @ApiProperty({
    description: 'Current merged value (tenant override if set, otherwise the default)',
    type: 'object',
    additionalProperties: true,
    example: true,
  })
  value!: unknown;

  @ApiProperty({
    description: 'Default value used when no tenant override exists',
    type: 'object',
    additionalProperties: true,
    example: true,
  })
  default!: unknown;

  @ApiProperty({ enum: ['boolean', 'string', 'number', 'json'], example: 'boolean' })
  type!: 'boolean' | 'string' | 'number' | 'json';

  @ApiProperty({ enum: ['tenant', 'superadmin'], example: 'tenant' })
  scope!: 'tenant' | 'superadmin';

  @ApiProperty({ example: 'Send notification emails to tenant admins' })
  description!: string;
}
