import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { EArticleStatus } from '../../domain/enums/article-status.enum';

export class PublishArticleDTO {
  @ApiProperty({
    description: 'Article status',
    enum: EArticleStatus,
    example: EArticleStatus.published,
  })
  @IsEnum(EArticleStatus)
  status: EArticleStatus;
}
