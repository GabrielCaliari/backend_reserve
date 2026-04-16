import { HashProvider } from './hash.provider';

describe('HashProvider', () => {
  let provider: HashProvider;
  const originalKey = process.env.ENCRYPT_PRIVATE_KEY;

  beforeAll(() => {
    process.env.ENCRYPT_PRIVATE_KEY = 'chave-de-teste-para-o-spec';
  });

  afterAll(() => {
    process.env.ENCRYPT_PRIVATE_KEY = originalKey;
  });

  beforeEach(() => {
    provider = new HashProvider();
  });

  it('sempre gera hash na versão 2', () => {
    const result = provider.hash('SenhaForte!123');
    expect(result.version).toBe(2);
    expect(result.salt).toHaveLength(32);
    expect(result.hash).toHaveLength(128);
  });

  it('valida um hash v2 recém-gerado com a versão default', () => {
    const { salt, hash } = provider.hash('SenhaForte!123');
    expect(provider.compare('SenhaForte!123', salt, hash)).toBe(true);
    expect(provider.compare('SenhaErrada!123', salt, hash)).toBe(false);
  });

  it('valida um hash legado v1 quando a versão 1 é passada', () => {
    // Reproduz o formato legado: 856 iterações com o mesmo esquema salt+chave.
    const crypto = require('crypto') as typeof import('crypto');
    const salt = crypto.randomBytes(16).toString('hex');
    const legacyHash = crypto
      .pbkdf2Sync('SenhaAntiga!1', salt + process.env.ENCRYPT_PRIVATE_KEY, 856, 64, 'sha512')
      .toString('hex');

    expect(provider.compare('SenhaAntiga!1', salt, legacyHash, 1)).toBe(true);
  });

  it('rejeita um hash legado v1 quando a versão 2 é usada por engano', () => {
    const crypto = require('crypto') as typeof import('crypto');
    const salt = crypto.randomBytes(16).toString('hex');
    const legacyHash = crypto
      .pbkdf2Sync('SenhaAntiga!1', salt + process.env.ENCRYPT_PRIVATE_KEY, 856, 64, 'sha512')
      .toString('hex');

    expect(provider.compare('SenhaAntiga!1', salt, legacyHash, 2)).toBe(false);
  });

  it('retorna false sem lançar quando o hash armazenado tem tamanho diferente', () => {
    const { salt } = provider.hash('SenhaForte!123');
    expect(provider.compare('SenhaForte!123', salt, 'abcd')).toBe(false);
  });

  it('usa 210000 iterações na versão 2', () => {
    const crypto = require('crypto') as typeof import('crypto');
    const { salt, hash } = provider.hash('SenhaForte!123');
    const expected = crypto
      .pbkdf2Sync('SenhaForte!123', salt + process.env.ENCRYPT_PRIVATE_KEY, 210_000, 64, 'sha512')
      .toString('hex');

    expect(hash).toBe(expected);
  });
});
