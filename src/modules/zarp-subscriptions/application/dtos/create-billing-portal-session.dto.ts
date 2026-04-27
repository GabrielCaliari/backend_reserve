import { IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBillingPortalSessionDTO {
  @ApiProperty({
    description: 'Tenant ID whose customer will access the billing portal',
    example: 'cma1tenant...',
  })
  @IsString()
  tenantId: string;

  @ApiProperty({
    description: 'URL to redirect the customer back to after they leave the portal',
    example: 'https://app.zarp.com/payments',
  })
  @IsUrl({ require_tld: false })
  returnUrl: string;
}
