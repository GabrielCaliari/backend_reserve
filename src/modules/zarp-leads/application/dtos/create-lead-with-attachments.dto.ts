import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsEnum, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { EOriginLead } from '../../domain/entities/lead.entity';
import { AttachmentDto } from './attachment.dto';

export class CreateLeadWithAttachmentsDto {
  @ApiPropertyOptional({ description: 'Lead name', example: 'John Smith' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Lead email', example: 'john@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Lead phone number', example: '11999999999' })
  @IsString()
  @IsOptional()
  phone_number?: string;

  @ApiProperty({ description: 'Lead origin', enum: EOriginLead, example: EOriginLead.page })
  @IsEnum(EOriginLead)
  origin: EOriginLead;

  @ApiPropertyOptional({ description: 'Origin source', example: 'Career Page' })
  @IsString()
  @IsOptional()
  origin_font?: string;

  @ApiPropertyOptional({ description: 'Description', example: 'Software Engineer applicant' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Collection ID (CUID)', example: 'cmmgmk6qr0000ikbwhnqawjbk' })
  @IsString()
  @IsOptional()
  collection_id?: string;

  @ApiPropertyOptional({ description: 'Additional data', example: { position: 'Senior Developer' } })
  @IsObject()
  @IsOptional()
  data?: any;

  @ApiPropertyOptional({ description: 'File attachments', type: [AttachmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  @IsOptional()
  attachments?: AttachmentDto[];
}
