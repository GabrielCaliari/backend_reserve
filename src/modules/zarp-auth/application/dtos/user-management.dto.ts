import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail } from 'class-validator';

const userCuidExample = 'cma1bcdef0001ghijklmno23p';
const planCuidExample = 'cma1pqrst0002uvwxyzab345';

export class UpdateUserDTO {
  @ApiPropertyOptional({ description: 'User name', example: 'Jane Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'User email', example: 'jane@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'User phone number', example: '5511999999999' })
  @IsString()
  @IsOptional()
  phone_number?: string;
}

export class UserResponseDTO {
  @ApiProperty({ example: userCuidExample, description: 'User CUID (25-character identifier)' })
  id: string;

  @ApiProperty({ example: 'Jane Doe' })
  name: string;

  @ApiProperty({ example: 'jane@example.com' })
  email: string;

  @ApiProperty({ example: '5511999999999' })
  phone_number: string;

  @ApiProperty({ example: '12345678901' })
  cpf: string;

  @ApiProperty({ example: 1, nullable: true })
  sex?: number;

  @ApiProperty({ example: '1990-01-01', nullable: true })
  date_of_birth?: Date;

  @ApiProperty({ example: '2025-12-31', nullable: true })
  date_expires_in?: Date;

  @ApiProperty({ example: planCuidExample, description: 'Plan CUID (25-character identifier)' })
  plan_id: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updated_at: Date;
}

export class UserListItemDTO {
  @ApiProperty({ example: userCuidExample, description: 'User CUID (25-character identifier)' })
  id: string;

  @ApiProperty({ example: 'Jane Doe' })
  name: string;

  @ApiProperty({ example: 'jane@example.com' })
  email: string;

  @ApiProperty({ example: '5511999999999' })
  phone_number: string;

  @ApiProperty({ example: '12345678901' })
  cpf: string;

  @ApiProperty({ example: planCuidExample, description: 'Plan CUID (25-character identifier)' })
  plan_id: string;

  @ApiProperty({ example: '2025-12-31', nullable: true })
  date_expires_in?: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  created_at: Date;
}

export class UserListResponseDTO {
  @ApiProperty({ type: [UserListItemDTO] })
  users: UserListItemDTO[];

  @ApiProperty({
    example: {
      page: 1,
      limit: 20,
      total: 100,
      totalPages: 5,
    },
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
