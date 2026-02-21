import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsInt, Min, IsString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

class ReorderItem {
  @ApiProperty({
    description: 'Relation ID (UUID string)',
    example: 'a1b2c3d4e5f6',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  relation_id: string;

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
 * **Validates: Requirements 7.15, 17.7**
 */
export class ReorderMediaDTO {
  @ApiProperty({
    description: 'Array of relation IDs with new display orders',
    type: [ReorderItem],
    example: [
      { relation_id: 'a1b2c3d4e5f6', display_order: 1 },
      { relation_id: 'b2c3d4e5f6g7', display_order: 2 },
      { relation_id: 'c3d4e5f6g7h8', display_order: 3 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItem)
  items: ReorderItem[];
}
