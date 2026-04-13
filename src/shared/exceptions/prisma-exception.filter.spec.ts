import { ArgumentsHost } from '@nestjs/common';
import { PrismaExceptionFilter } from './prisma-exception.filter';

function makeHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url: '/api/leads', method: 'POST' }),
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

class FakePrismaError extends Error {
  constructor(public code: string, public meta?: Record<string, unknown>) {
    super(`Prisma error ${code}`);
    this.name = 'PrismaClientKnownRequestError';
  }
}

describe('PrismaExceptionFilter', () => {
  it('traduz violação de unicidade (P2002) em 409', () => {
    const { host, status, json } = makeHost();
    new PrismaExceptionFilter().catch(new FakePrismaError('P2002', { target: ['email'] }), host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409, code: 'UNIQUE_CONSTRAINT_VIOLATION' }),
    );
  });

  it('traduz registro não encontrado (P2025) em 404', () => {
    const { host, status } = makeHost();
    new PrismaExceptionFilter().catch(new FakePrismaError('P2025'), host);

    expect(status).toHaveBeenCalledWith(404);
  });

  it('traduz violação de chave estrangeira (P2003) em 400', () => {
    const { host, status } = makeHost();
    new PrismaExceptionFilter().catch(new FakePrismaError('P2003'), host);

    expect(status).toHaveBeenCalledWith(400);
  });

  it('devolve 500 genérico para código desconhecido e não vaza a mensagem do Prisma', () => {
    const { host, status, json } = makeHost();
    new PrismaExceptionFilter().catch(new FakePrismaError('P9999'), host);

    expect(status).toHaveBeenCalledWith(500);
    const payload = json.mock.calls[0][0];
    expect(JSON.stringify(payload)).not.toContain('P9999');
    expect(JSON.stringify(payload)).not.toContain('Prisma');
  });
});
