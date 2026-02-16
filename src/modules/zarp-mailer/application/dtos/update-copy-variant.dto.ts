import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CopyVariationType } from '@/modules/zarp-mailer/domain/enums';

export class UpdateCopyVariantDto {
  @ApiProperty({
    description: 'Tipo de variação de copy',
    enum: CopyVariationType,
    example: CopyVariationType.AI,
  })
  @IsEnum(CopyVariationType)
  copy_variation_type: CopyVariationType;
}
