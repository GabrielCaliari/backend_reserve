import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsBoolean, Length, MaxLength } from 'class-validator';
import { EWhatsAppTemplateType } from '../../domain/enums/whatsapp-template-type.enum';

export class CreateWhatsAppTemplateDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ enum: EWhatsAppTemplateType }) @IsEnum(EWhatsAppTemplateType) type: EWhatsAppTemplateType;
  @ApiProperty() @IsString() body: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}

export class SendWhatsAppMessageDto {
  @ApiProperty() @IsString() template_id: string;
  @ApiProperty() @IsString() guest_phone: string;
  @ApiPropertyOptional() @IsOptional() @IsString() guest_name?: string;
}

/** Mensagem livre do humano pelo painel -> Canal B `send_message` (contrato v2 §5.1). */
export class SendBotMessageDto {
  @ApiProperty({ description: 'Telefone do destinatario (com DDI).', minLength: 8, maxLength: 20, example: '5535999999999' })
  @IsString() @Length(8, 20)
  to_phone: string;

  @ApiPropertyOptional({ description: 'Nome do destinatario.', maxLength: 150, example: 'Maria' })
  @IsOptional() @IsString() @MaxLength(150)
  to_name?: string;

  @ApiProperty({ description: 'Texto livre da mensagem.', minLength: 1, maxLength: 1000, example: 'Ola! Confirmamos sua reserva.' })
  @IsString() @Length(1, 1000)
  body: string;
}

/** Resposta do envio de texto livre: 200 quando o bot aceitou, 502 (mesmo corpo, ok=false) quando nao. */
export class SendBotMessageResponseDto {
  @ApiProperty({ description: 'false = mensagem NAO enviada (HTTP 502); nao e reenviada automaticamente.' })
  ok: boolean;

  @ApiProperty({ nullable: true, type: String }) state: string | null;

  @ApiProperty({ description: 'true se a ultima mensagem do cliente tem mais de 24h (a Meta pode recusar).' })
  foraDaJanela: boolean;
}
