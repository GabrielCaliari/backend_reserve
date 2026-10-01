import { IsEnum, IsOptional, IsString, IsBoolean, Length, MaxLength } from 'class-validator';
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

/** Mensagem livre do humano pelo painel -> Canal B `send_message` (contrato v2 §5.1). */
export class SendBotMessageDto {
  @IsString() @Length(8, 20)
  to_phone: string;

  @IsOptional() @IsString() @MaxLength(150)
  to_name?: string;

  @IsString() @Length(1, 1000)
  body: string;
}
