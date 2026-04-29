import * as jwt from 'jsonwebtoken';
import { JwtProvider } from './jwt.provider';

describe('JwtProvider.validate', () => {
  const originalKey = process.env.JWT_PRIVATE_KEY;
  let provider: JwtProvider;

  beforeAll(() => {
    process.env.JWT_PRIVATE_KEY = 'chave-jwt-de-teste';
  });

  afterAll(() => {
    process.env.JWT_PRIVATE_KEY = originalKey;
  });

  beforeEach(() => {
    provider = new JwtProvider();
  });

  it('devolve o payload para um token válido', async () => {
    const token = await provider.generate({ id: 'abc' }, 3600);
    const result = await provider.validate(token);

    expect(result.payload?.id).toBe('abc');
    expect(result.expired).toBeUndefined();
    expect(result.invalid).toBeUndefined();
  });

  it('marca como expirado (não inválido) um token vencido', async () => {
    const token = jwt.sign({ id: 'abc' }, 'chave-jwt-de-teste', { expiresIn: -10 });
    const result = await provider.validate(token);

    expect(result.expired).toBe(true);
    expect(result.invalid).toBeUndefined();
  });

  it('marca como inválido (não expirado) um token com assinatura forjada', async () => {
    const token = jwt.sign({ id: 'abc' }, 'chave-completamente-diferente', { expiresIn: 3600 });
    const result = await provider.validate(token);

    expect(result.invalid).toBe(true);
    expect(result.expired).toBeUndefined();
  });

  it('marca como inválido um token ainda não válido (nbf no futuro)', async () => {
    const token = jwt.sign({ id: 'abc', nbf: Math.floor(Date.now() / 1000) + 600 }, 'chave-jwt-de-teste');
    const result = await provider.validate(token);

    expect(result.invalid).toBe(true);
    expect(result.expired).toBeUndefined();
  });
});
