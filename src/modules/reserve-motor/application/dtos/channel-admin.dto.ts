import { IsBoolean, IsObject, IsString, Length } from 'class-validator';

/**
 * DTOs da API admin de canais (tela /dashboard/motor/canais). O invite code
 * NUNCA e persistido; o refresh token e o webhook_secret NUNCA voltam em
 * leitura (o segredo aparece UMA unica vez, na resposta do connect).
 */

export class ConnectChannelAdminDto {
  @IsString() @Length(1, 500) invite_code: string;
  @IsString() @Length(1, 40) beds24_property_id: string;
}

/** map: room_type_id -> beds24 roomId (mapeamento manual do onboarding). */
export class SaveRoomMapDto {
  @IsObject() map: Record<string, number | string>;
}

export class Reconcile2xDto {
  @IsBoolean() enabled: boolean;
}
