import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const authorCuidExample = 'cmcmsauthor01abc234def5678';
const tenantCuidExample = 'cma1tenant001uvwxyzab345';
const mediaAssetCuidExample = 'cmcmsasset01abc234def56789';

export class AuthorAvatarResponseDTO {
  @ApiProperty({ description: 'Media asset CUID', example: mediaAssetCuidExample })
  id: string;

  @ApiProperty({ description: 'Public asset URL', example: 'https://cdn.example.com/authors/john-doe.jpg' })
  url: string;

  @ApiProperty({ description: 'Storage object key', example: 'authors/john-doe.jpg' })
  storage_key: string;

  @ApiProperty({ description: 'Original file name', example: 'john-doe.jpg' })
  filename: string;

  @ApiProperty({ description: 'Detected MIME type', example: 'image/jpeg' })
  mime_type: string;

  @ApiProperty({ description: 'File size in bytes', example: 245678 })
  file_size: number;

  @ApiPropertyOptional({ description: 'Image width in pixels', example: 1200, nullable: true })
  width?: number | null;

  @ApiPropertyOptional({ description: 'Image height in pixels', example: 1200, nullable: true })
  height?: number | null;

  @ApiPropertyOptional({ description: 'Alternative text', example: 'Portrait of John Doe', nullable: true })
  alt_text?: string | null;
}

export class AuthorResponseDTO {
  @ApiProperty({ description: 'Author CUID', example: authorCuidExample })
  id: string;

  @ApiProperty({ description: 'Author first name', example: 'John' })
  first_name: string;

  @ApiProperty({ description: 'Author last name', example: 'Doe' })
  last_name: string;

  @ApiProperty({ description: 'Computed full name', example: 'John Doe' })
  full_name: string;

  @ApiPropertyOptional({ description: 'Author biography', example: 'John is a software engineer...', nullable: true })
  biography: string | null;

  @ApiPropertyOptional({ description: 'Avatar MediaAsset CUID', example: mediaAssetCuidExample, nullable: true })
  avatar_id: string | null;

  @ApiProperty({ description: 'Tenant CUID owner of this author', example: tenantCuidExample })
  tenant_id: string;

  @ApiProperty({ description: 'Active status', example: true })
  active: boolean;

  @ApiProperty({ description: 'Creation timestamp', example: '2026-02-19T10:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ description: 'Last update timestamp', example: '2026-02-19T12:00:00.000Z' })
  updated_at: Date;

  @ApiPropertyOptional({ description: 'Expanded avatar payload when available', type: AuthorAvatarResponseDTO })
  avatar?: AuthorAvatarResponseDTO;
}

export class AuthorPaginationResponseDTO {
  @ApiProperty({ example: 12 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 30 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

export class PaginatedAuthorsResponseDTO {
  @ApiProperty({ type: [AuthorResponseDTO] })
  data: AuthorResponseDTO[];

  @ApiProperty({ type: AuthorPaginationResponseDTO })
  pagination: AuthorPaginationResponseDTO;
}

export class AssignAuthorAvatarDTO {
  @ApiProperty({
    description: 'Existing MediaAsset CUID to assign as the author avatar',
    example: mediaAssetCuidExample,
  })
  avatarId: string;
}

export class SuccessMessageResponseDTO {
  @ApiProperty({ description: 'Operation result message', example: 'Author deleted successfully' })
  message: string;
}
