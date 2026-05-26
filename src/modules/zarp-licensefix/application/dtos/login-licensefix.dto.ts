import { IsEmail, IsString } from 'class-validator';

export class LoginLicensefixDto {
  @IsString()
  tenant_id: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
