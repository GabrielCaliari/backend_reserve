import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ENotificationScope, ENotificationType } from '../../domain/enums';

export class NotificationResponseDto {
  @ApiProperty({ example: 'cma1notif0001ghijklmno23p' })
  id!: string;

  @ApiProperty({ example: 'Nova versão disponível' })
  title!: string;

  @ApiProperty({ example: 'Confira as novidades desta versão do painel.' })
  body!: string;

  @ApiProperty({ enum: ENotificationType, example: ENotificationType.manual })
  type!: ENotificationType;

  @ApiProperty({ enum: ENotificationScope, example: ENotificationScope.broadcast })
  scope!: ENotificationScope;

  @ApiProperty({ type: [String], example: [] })
  tenant_ids!: string[];

  @ApiPropertyOptional({ example: 'lead.created', nullable: true })
  event_key?: string | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
  metadata?: Record<string, unknown> | null;

  @ApiProperty({ example: false })
  send_email!: boolean;

  @ApiPropertyOptional({ example: '2026-08-01T12:00:00.000Z', nullable: true })
  scheduled_at?: Date | null;

  @ApiPropertyOptional({ example: '2026-07-26T12:00:00.000Z', nullable: true })
  published_at?: Date | null;

  @ApiPropertyOptional({ example: 'cma1admin0001ghijklmno23p', nullable: true })
  created_by?: string | null;

  @ApiProperty({ example: '2026-07-26T12:00:00.000Z' })
  created_at!: Date;

  @ApiProperty({ example: '2026-07-26T12:00:00.000Z' })
  updated_at!: Date;
}

export class PaginatedNotificationsResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  data!: NotificationResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;
}

export class TenantNotificationReceiptResponseDto {
  @ApiProperty({ example: 'cma1recpt0001ghijklmno23p' })
  id!: string;

  @ApiProperty({ example: 'cma1notif0001ghijklmno23p' })
  notification_id!: string;

  @ApiProperty({ example: 'cma1tenant001uvwxyzab345' })
  tenant_id!: string;

  @ApiPropertyOptional({ example: 'cma1admin0001ghijklmno23p', nullable: true })
  admin_id?: string | null;

  @ApiPropertyOptional({ example: '2026-07-26T12:05:00.000Z', nullable: true })
  first_viewed_at?: Date | null;

  @ApiPropertyOptional({ example: '2026-07-26T12:05:00.000Z', nullable: true })
  last_viewed_at?: Date | null;

  @ApiProperty({ example: false })
  viewed!: boolean;

  @ApiProperty({ type: NotificationResponseDto })
  Notification!: NotificationResponseDto;

  @ApiProperty({ example: '2026-07-26T12:00:00.000Z' })
  created_at!: Date;

  @ApiProperty({ example: '2026-07-26T12:00:00.000Z' })
  updated_at!: Date;
}

export class PaginatedTenantNotificationsResponseDto {
  @ApiProperty({ type: [TenantNotificationReceiptResponseDto] })
  data!: TenantNotificationReceiptResponseDto[];

  @ApiProperty({ example: 17 })
  total!: number;
}

export class UnreadCountResponseDto {
  @ApiProperty({ example: 3 })
  count!: number;
}

export class OkResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;
}

export class NotificationSettingsResponseDto {
  @ApiProperty({ example: 'cma1nsett0001ghijklmno23p' })
  id!: string;

  @ApiProperty({ example: 'cma1tenant001uvwxyzab345' })
  tenant_id!: string;

  @ApiProperty({ example: true })
  email_enabled!: boolean;

  @ApiProperty({ example: true })
  inapp_enabled!: boolean;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'boolean' }, example: { 'lead.created': true } })
  event_settings!: Record<string, boolean>;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'boolean' }, example: { 'subscription.expiry_check': true } })
  cron_settings!: Record<string, boolean>;

  @ApiProperty({ example: 'America/Sao_Paulo' })
  timezone!: string;

  @ApiProperty({ example: '2026-07-26T12:00:00.000Z' })
  created_at!: Date;

  @ApiProperty({ example: '2026-07-26T12:00:00.000Z' })
  updated_at!: Date;
}
