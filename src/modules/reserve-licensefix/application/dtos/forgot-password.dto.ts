import { IsEmail, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @IsString()
  tenant_id: string;

  @IsEmail()
  email: string;
}
