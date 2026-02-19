import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class ReorderItem {
  @ApiProperty({
    description: 'Relation ID',
    example: 1,
    type: Number,
  })
  @IsInt()
  @Min(1)
  relation_id: number;

  @ApiProperty({
    description: 'New display order',
    example: 1,
    type: Number,
  })
  @IsInt()
  @Min(0)
  display_order: number;
}

/**
 * DTO for reordering media assets attached to an entity
 * 
 * **Validates: Requirements 7.15**
 */
export class ReorderMediaDTO {
  @ApiProperty({
    description: 'Array of relation IDs with new display orders',
    type: [ReorderItem],
    example: [
      { relation_id: 1, display_order: 1 },
      { relation_id: 2, display_order: 2 },
      { relation_id: 3, display_order: 3 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItem)
  items: ReorderItem[];
}
