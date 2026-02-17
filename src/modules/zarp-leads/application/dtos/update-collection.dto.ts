import { PartialType } from '@nestjs/swagger';
import { CreateCollectionDto } from './create-collection.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCollectionDto extends PartialType(CreateCollectionDto) {
  @ApiProperty({ example: true, description: 'Whether the collection is active', required: false })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
