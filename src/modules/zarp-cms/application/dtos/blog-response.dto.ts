import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BlogResponseDTO {
  @ApiProperty({
    description: 'Blog ID (UUID)',
    example: 'abc123def456',
  })
  id: string;

  @ApiProperty({
    description: 'Blog name',
    example: 'Tech Blog',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Blog description',
    example: 'A blog about technology and software development',
  })
  description: string | null;

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
