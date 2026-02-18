import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsEmail } from 'class-validator';
import { EAdminRole } from '../../domain/enums/admin-role.enum';

export class CreateAdminDTO {
  @ApiProperty({ description: 'Administrator name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Administrator email', example: 'john@company.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Administrator password', example: 'Str0ng!Pass' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({
    description: 'Administrator role',
    enum: EAdminRole,
    default: EAdminRole.company_admin,
  })
  @IsEnum(EAdminRole)
  @IsOptional()
  role?: EAdminRole;
}

export class UpdateAdminRoleDTO {
  @ApiProperty({ description: 'New role', enum: EAdminRole })
  @IsEnum(EAdminRole)
  @IsNotEmpty()
  role: EAdminRole;
}
