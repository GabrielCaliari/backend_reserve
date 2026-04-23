import { IsBoolean, IsOptional } from 'class-validator';

export class CancelSubscriptionDTO {
  @IsOptional()
  @IsBoolean()
  cancelImmediately?: boolean = false;
}
