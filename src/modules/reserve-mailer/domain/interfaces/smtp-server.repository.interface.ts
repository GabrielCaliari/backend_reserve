/**
 * SMTP Server Repository interface
 */
export interface ISMTPServerRepository {
  findDefault(): Promise<{ id: string; host: string; port: number; user: string; password: string } | null>;
  findById(id: string): Promise<{ id: string; host: string; port: number; user: string; password: string } | null>;
}

export const SMTP_SERVER_REPOSITORY = Symbol('SMTP_SERVER_REPOSITORY');
