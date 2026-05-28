import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { EWhatsAppTemplateType } from '../../domain/enums/whatsapp-template-type.enum';

export class CreateWhatsAppTemplateDto {
  @IsString() name: string;
  @IsEnum(EWhatsAppTemplateType) type: EWhatsAppTemplateType;
  @IsString() body: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class SendWhatsAppMessageDto {
  @IsString() template_id: string;
  @IsString() guest_phone: string;
  @IsOptional() @IsString() guest_name?: string;
}
