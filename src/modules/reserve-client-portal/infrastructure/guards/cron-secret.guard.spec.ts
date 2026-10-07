import { UnauthorizedException } from '@nestjs/common';
import { CronSecretGuard } from './cron-secret.guard';

const ctx = (auth?: string) => ({
  switchToHttp: () => ({ getRequest: () => ({ headers: auth ? { authorization: auth } : {} }) }),
}) as any;

describe('CronSecretGuard', () => {
  const original = process.env.CRON_SECRET;
  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it('aceita o Bearer igual ao CRON_SECRET', () => {
    process.env.CRON_SECRET = 'x'.repeat(32);
    expect(new CronSecretGuard().canActivate(ctx(`Bearer ${'x'.repeat(32)}`))).toBe(true);
  });
  it('recusa segredo errado', () => {
    process.env.CRON_SECRET = 'x'.repeat(32);
    expect(() => new CronSecretGuard().canActivate(ctx('Bearer errado'))).toThrow(UnauthorizedException);
  });
  it('CRON_SECRET com menos de 32 caracteres conta como ausente e recusa', () => {
    process.env.CRON_SECRET = 'x'.repeat(31);
    expect(() => new CronSecretGuard().canActivate(ctx(`Bearer ${'x'.repeat(31)}`))).toThrow(UnauthorizedException);
  });
  it('sem CRON_SECRET configurado recusa sempre', () => {
    delete process.env.CRON_SECRET;
    expect(() => new CronSecretGuard().canActivate(ctx('Bearer '))).toThrow(UnauthorizedException);
  });
});
