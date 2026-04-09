import { isSwaggerEnabled } from './swagger.config';

describe('isSwaggerEnabled', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFlag = process.env.SWAGGER_ENABLED;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.SWAGGER_ENABLED = originalFlag;
  });

  it('habilita fora de produção', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.SWAGGER_ENABLED;
    expect(isSwaggerEnabled()).toBe(true);
  });

  it('desabilita em produção por padrão', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SWAGGER_ENABLED;
    expect(isSwaggerEnabled()).toBe(false);
  });

  it('habilita em produção somente com opt-in explícito', () => {
    process.env.NODE_ENV = 'production';
    process.env.SWAGGER_ENABLED = 'true';
    expect(isSwaggerEnabled()).toBe(true);
  });

  it('não aceita valor diferente da string "true" como opt-in', () => {
    process.env.NODE_ENV = 'production';
    process.env.SWAGGER_ENABLED = '1';
    expect(isSwaggerEnabled()).toBe(false);
  });
});
