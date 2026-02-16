import { IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ArticleOrderItem {
  @ApiProperty({ description: 'Article ID', example: 1 })
  @IsInt()
  id: number;

  @ApiProperty({ description: 'Display order position', example: 1 })
  @IsInt()
  @Min(0)
  display_order: number;
}

export class ReorderArticlesDTO {
  @ApiProperty({
    description: 'Array of article IDs with their new display order',
    type: [ArticleOrderItem],
    example: [
      { id: 3, display_order: 1 },
      { id: 1, display_order: 2 },
      { id: 5, display_order: 3 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArticleOrderItem)
  order: ArticleOrderItem[];
}
