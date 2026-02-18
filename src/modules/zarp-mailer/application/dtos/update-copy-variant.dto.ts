import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CopyVariationType } from '../../domain/enums';

export class UpdateCopyVariantDto {
  @ApiProperty({
    description: 'Copy variation type',
    enum: CopyVariationType,
    example: CopyVariationType.AI,
  })
  @IsEnum(CopyVariationType)
  copy_variation_type: CopyVariationType;
}
