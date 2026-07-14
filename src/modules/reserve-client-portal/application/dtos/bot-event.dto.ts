import { IsISO8601, IsObject, IsString, IsUUID } from 'class-validator';

/** Contract shape, from §5.6 of the master doc. */
export class BotEventDto {
  @IsUUID()
  event_id: string;

  @IsString()
  event_type: string;

  @IsISO8601()
  occurred_at: string;

  @IsObject()
  payload: Record<string, unknown>;
}
