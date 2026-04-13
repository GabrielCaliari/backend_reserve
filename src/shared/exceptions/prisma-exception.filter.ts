import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';

interface PrismaErrorMapping {
  status: number;
  code: string;
  message: string;
}

/**
 * Traduz erro conhecido do Prisma em resposta HTTP com texto em português.
 * A mensagem original do Prisma nunca chega ao cliente: ela cita nome de
 * tabela, de coluna e às vezes o valor que colidiu.
 */
const MAPPINGS: Record<string, PrismaErrorMapping> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    code: 'UNIQUE_CONSTRAINT_VIOLATION',
    message: 'Já existe um registro com esse valor.',
  },
  P2003: {
    status: HttpStatus.BAD_REQUEST,
    code: 'FOREIGN_KEY_VIOLATION',
    message: 'O registro referenciado não existe.',
  },
  P2025: {
    status: HttpStatus.NOT_FOUND,
    code: 'RECORD_NOT_FOUND',
    message: 'Registro não encontrado.',
  },
  P2014: {
    status: HttpStatus.BAD_REQUEST,
    code: 'RELATION_VIOLATION',
    message: 'A operação quebraria uma relação obrigatória entre registros.',
  },
};

const FALLBACK: PrismaErrorMapping = {
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  code: 'DATABASE_ERROR',
  message: 'Não foi possível concluir a operação no banco de dados.',
};

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();

    const code = (exception as { code?: string })?.code;
    const mapping = (code && MAPPINGS[code]) || FALLBACK;

    // O detalhe fica no log do servidor, não na resposta.
    this.logger.error(
      `${request?.method} ${request?.url} → Prisma ${code ?? 'validation'}: ${(exception as Error)?.message}`,
    );

    response.status(mapping.status).json({
      statusCode: mapping.status,
      code: mapping.code,
      message: mapping.message,
    });
  }
}
