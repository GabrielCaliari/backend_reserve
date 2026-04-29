import { UserService } from './user.service';

/**
 * Item 5 do plano de hardening (Fase 1): lockout progressivo de conta para
 * UserCredential / login B2C, espelhando o que já existe para AdminCredential.
 * Sem isso, contas B2C podiam ser atacadas por força bruta sem nenhum
 * bloqueio persistido (só o rate limit por IP do ThrottlerGuard).
 */
describe('lockout no login de usuário (B2C)', () => {
  function buildService(overrides: Partial<{
    findLockoutState: jest.Mock;
    compareHashByUserId: jest.Mock;
    registerFailedAttempt: jest.Mock;
    clearFailedAttempts: jest.Mock;
    rehashToLatest: jest.Mock;
    selectByEmail: jest.Mock;
    sessionCreate: jest.Mock;
  }> = {}) {
    const userRepository = { selectByEmail: overrides.selectByEmail ?? jest.fn() } as any;
    const userCredentialRepository = {
      findLockoutState: overrides.findLockoutState ?? jest.fn().mockResolvedValue(null),
      compareHashByUserId: overrides.compareHashByUserId ?? jest.fn().mockResolvedValue(true),
      registerFailedAttempt: overrides.registerFailedAttempt ?? jest.fn(),
      clearFailedAttempts: overrides.clearFailedAttempts ?? jest.fn(),
      rehashToLatest: overrides.rehashToLatest ?? jest.fn(),
    } as any;
    const userSessionTokenRepository = {
      create: overrides.sessionCreate ?? jest.fn().mockResolvedValue({ id: 's1', token: 't1' }),
    } as any;
    const service = new UserService(
      userRepository,
      userCredentialRepository,
      userSessionTokenRepository,
      {} as any,
      {} as any,
    );
    return { service, userRepository, userCredentialRepository, userSessionTokenRepository };
  }

  it('retorna 423 quando a conta está travada', async () => {
    const { service } = buildService({
      selectByEmail: jest.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com' }),
      findLockoutState: jest.fn().mockResolvedValue({
        lockedUntil: new Date(Date.now() + 60_000),
        failedAttempts: 5,
        hashVersion: 2,
      }),
    });
    const result = await service.authenticate({ email: 'a@b.com', password: 'x' } as any);
    expect(result.status).toBe(423);
  });

  it('não trava quando lockedUntil já expirou no passado', async () => {
    const { service, userCredentialRepository } = buildService({
      selectByEmail: jest.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com' }),
      findLockoutState: jest.fn().mockResolvedValue({
        lockedUntil: new Date(Date.now() - 60_000),
        failedAttempts: 5,
        hashVersion: 2,
      }),
    });
    const result = await service.authenticate({ email: 'a@b.com', password: 'right' } as any);
    expect(result.status).toBe(200);
    expect(userCredentialRepository.clearFailedAttempts).toHaveBeenCalledWith('u1');
  });

  it('registra tentativa falha em vez de estourar 500 sem credential row', async () => {
    const { service, userCredentialRepository } = buildService({
      selectByEmail: jest.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com' }),
      compareHashByUserId: jest.fn().mockResolvedValue(false),
    });
    const result = await service.authenticate({ email: 'a@b.com', password: 'wrong' } as any);
    expect(result.status).toBe(401);
    expect(userCredentialRepository.registerFailedAttempt).toHaveBeenCalledWith('u1');
  });

  it('limpa tentativas falhas em login bem-sucedido', async () => {
    const { service, userCredentialRepository } = buildService({
      selectByEmail: jest.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com' }),
    });
    const result = await service.authenticate({ email: 'a@b.com', password: 'right' } as any);
    expect(result.status).toBe(200);
    expect(userCredentialRepository.clearFailedAttempts).toHaveBeenCalledWith('u1');
  });

  it('não chama findLockoutState/registerFailedAttempt/clearFailedAttempts quando o usuário não existe', async () => {
    const { service, userCredentialRepository } = buildService({
      selectByEmail: jest.fn().mockResolvedValue(null),
    });
    const result = await service.authenticate({ email: 'nope@b.com', password: 'x' } as any);
    expect(result.status).toBe(401);
    expect(userCredentialRepository.findLockoutState).not.toHaveBeenCalled();
  });

  it('faz re-hash transparente de v1 para v2 em login bem-sucedido, espelhando o admin', async () => {
    const { service, userCredentialRepository } = buildService({
      selectByEmail: jest.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com' }),
      findLockoutState: jest.fn().mockResolvedValue({
        lockedUntil: null,
        failedAttempts: 0,
        hashVersion: 1,
      }),
    });
    const result = await service.authenticate({ email: 'a@b.com', password: 'right' } as any);
    expect(result.status).toBe(200);
    expect(userCredentialRepository.rehashToLatest).toHaveBeenCalledWith('u1', 'right');
  });

  it('não faz re-hash quando a credencial já está em v2', async () => {
    const { service, userCredentialRepository } = buildService({
      selectByEmail: jest.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com' }),
      findLockoutState: jest.fn().mockResolvedValue({
        lockedUntil: null,
        failedAttempts: 0,
        hashVersion: 2,
      }),
    });
    const result = await service.authenticate({ email: 'a@b.com', password: 'right' } as any);
    expect(result.status).toBe(200);
    expect(userCredentialRepository.rehashToLatest).not.toHaveBeenCalled();
  });
});
