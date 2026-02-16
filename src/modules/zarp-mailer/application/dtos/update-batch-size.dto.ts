import { IsNumber, IsPositive, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCampaignBatchSizeDto {
  @ApiProperty({
    description: 'Tamanho do batch da campanha (mínimo 100)',
    example: 500,
    minimum: 100,
  })
  @IsNumber()
  @IsPositive()
  @Min(100)
  campaign_batch_size: number;
}
