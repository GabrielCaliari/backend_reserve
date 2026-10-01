import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { BotIngestBearerGuard } from './bot-ingest-bearer.guard';

function ctx(request: any) {
  return { switchToHttp: () => ({ getRequest: () => request }) } as any;
}

describe('BotIngestBearerGuard', () => {
  const config = {
    id: 'cfg_1', tenant_id: 'tenant_1', active: true,
    tenant_key_hash: 'hash', tenant_key_salt: 'salt',
  };
  let prisma: { botIntegrationConfig: { findFirst: jest.Mock } };
  let keys: { verify: jest.Mock };
  let guard: BotIngestBearerGuard;

  beforeEach(() => {
    prisma = { botIntegrationConfig: { findFirst: jest.fn().mockResolvedValue(config) } };
    keys = { verify: jest.fn().mockReturnValue(true) };
    guard = new BotIngestBearerGuard(prisma as any, keys as any);
  });

  it('aceita a chave Bearer e resolve o tenant pelo identificador do bot', async () => {
    const request: any = {
      headers: { authorization: 'Bearer chave-secreta' },
      body: { tenant_id: 'cli_dona_tereza' },
    };
    await expect(guard.canActivate(ctx(request))).resolves.toBe(true);
    expect(prisma.botIntegrationConfig.findFirst).toHaveBeenCalledWith({
      where: { OR: [{ bot_tenant_ref: 'cli_dona_tereza' }, { tenant_id: 'cli_dona_tereza' }] },
    });
    expect(keys.verify).toHaveBeenCalledWith('chave-secreta', 'hash', 'salt');
    expect(request.tenant_id).toBe('tenant_1');
  });

  it('401 sem Authorization Bearer', async () => {
    const request = { headers: {}, body: { tenant_id: 'cli_dona_tereza' } };
    await expect(guard.canActivate(ctx(request))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('400 sem tenant_id no corpo', async () => {
    const request = { headers: { authorization: 'Bearer x' }, body: {} };
    await expect(guard.canActivate(ctx(request))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('403 quando o tenant nao existe ou esta desativado', async () => {
    prisma.botIntegrationConfig.findFirst.mockResolvedValue({ ...config, active: false });
    const request = { headers: { authorization: 'Bearer x' }, body: { tenant_id: 'cli_outro' } };
    await expect(guard.canActivate(ctx(request))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('401 quando a chave nao bate', async () => {
    keys.verify.mockReturnValue(false);
    const request = { headers: { authorization: 'Bearer errada' }, body: { tenant_id: 'cli_dona_tereza' } };
    await expect(guard.canActivate(ctx(request))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
