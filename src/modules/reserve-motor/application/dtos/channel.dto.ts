import { IsOptional, IsString, Length } from 'class-validator';

/** Conexao inicial com o Beds24 (invite code NUNCA e persistido). */
export class ConnectChannelDto {
  @IsString() @Length(1, 500) invite_code: string;
  @IsOptional() @IsString() @Length(1, 40) beds24_property_id?: string;
}

/** GET /authentication/setup — troca invite code por refresh token. */
export interface Beds24AuthSetupResponse {
  token: string;
  expiresIn: number;
  refreshToken: string;
}

/** GET /authentication/token — access token curto via refresh token. */
export interface Beds24TokenResponse {
  token: string;
  expiresIn: number;
}

/** Segmento de calendario do push em lote (from/to INCLUSIVOS no Beds24). */
export interface Beds24CalendarSegment {
  from: string;
  to: string;
  numAvail: number;
  price1?: number;
  minStay?: number;
}

/** Item do POST /inventory/rooms/calendar — um por quarto, NUNCA por dia. */
export interface Beds24CalendarPushItem {
  roomId: number;
  calendar: Beds24CalendarSegment[];
}
