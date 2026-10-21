import { EPlatform } from '../enums/platform.enum';
import { EIntegrationStatus } from '../enums/integration-status.enum';

export class ApiCredentialEntity {
  id: string;
  client_id: string;
  platform: EPlatform;
  encrypted_token: string | null;
  refresh_token?: string | null;
  token_expires_at?: Date | null;
  last_sync_at?: Date | null;
  sync_status: EIntegrationStatus;
  error_message?: string | null;
  created_at: Date;
  updated_at: Date;

  constructor(partial: Partial<ApiCredentialEntity>) {
    Object.assign(this, partial);
  }
}
