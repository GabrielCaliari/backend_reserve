import { IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ImageOrderItem {
  @ApiProperty({ description: 'Image ID', example: 1 })
  @IsInt()
  id: number;

  @ApiProperty({ description: 'Display order position', example: 1 })
  @IsInt()
  @Min(0)
  display_order: number;
}

export class ReorderImagesDTO {
  @ApiProperty({
    description: 'Array of image IDs with their new display order',
    type: [ImageOrderItem],
    example: [
      { id: 5, display_order: 1 },
      { id: 2, display_order: 2 },
      { id: 8, display_order: 3 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageOrderItem)
  order: ImageOrderItem[];
}
