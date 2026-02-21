import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthorResponseDTO {
  @ApiProperty({
    description: 'Author ID (UUID)',
    example: 'ckm5678efgh9',
  })
  id: string;

  @ApiProperty({
    description: 'Author first name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'Author last name',
    example: 'Doe',
  })
  lastName: string;

  @ApiPropertyOptional({
    description: 'Author biography',
    example: 'John is a software engineer...',
  })
  biography: string | null;

  @ApiPropertyOptional({
    description: 'Avatar MediaAsset ID (UUID)',
    example: 'ckl1234abcd5',
  })
  avatarId: string | null;

  @ApiProperty({
    description: 'Tenant ID',
    example: 1,
  })
  tenantId: number;

  @ApiProperty({
    description: 'Active status',
    example: true,
  })
  active: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-02-19T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-02-19T12:00:00Z',
  })
  updatedAt: Date;
}
