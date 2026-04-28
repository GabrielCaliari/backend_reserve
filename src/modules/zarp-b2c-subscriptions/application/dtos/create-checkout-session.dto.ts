import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckoutSessionDTO {
  @ApiProperty({ description: 'Product price ID (internal, not Stripe price ID)' })
  @IsString()
  @IsNotEmpty()
  priceId: string;
}
