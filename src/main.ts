import 'dotenv/config';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { setupSwagger } from './swagger.config';
import { MulterExceptionFilter } from './shared/exceptions/multer-exception.filter';
import { DomainExceptionFilter } from './shared/exceptions/domain-exception.filter';
import { ConnectionErrorFilter } from './shared/exceptions/connection-error.filter';
import { PrismaExceptionFilter } from './shared/exceptions/prisma-exception.filter';
import { Request, Response, NextFunction, json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Preserva o corpo cru para a validação de assinatura do webhook do Stripe.
  // Necessário porque desligamos o bodyParser embutido do Nest para poder
  // impor um limite de tamanho.
  const rawBodySaver = (req: Request, _res: Response, buffer: Buffer) => {
    if (buffer?.length) {
      (req as Request & { rawBody?: Buffer }).rawBody = buffer;
    }
  };

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: false,
  });

  // Registrada direto no adaptador: fica fora do prefixo `api` e antes de
  // qualquer guard global, para o health check do load balancer nunca
  // depender de autenticação nem de banco.
  app.getHttpAdapter().getInstance().get('/health', (_req: any, res: any) => res.status(200).send('OK'));

  app.use(cookieParser());

  // CSP desligado: esta é uma API JSON e o CSP default quebra os scripts
  // inline do Swagger UI. crossOriginResourcePolicy relaxado para que
  // portais de tenant em outras origens carreguem assets servidos pela API.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(json({ limit: '5mb', verify: rawBodySaver }));
  app.use(urlencoded({ extended: true, limit: '5mb', verify: rawBodySaver }));

  app.setGlobalPrefix('api', { exclude: ['wa/:code'] });

  // Atrás de nginx/proxy o IP do cliente chega em X-Forwarded-For; sem isso
  // o throttler da Task 4 limitaria o IP do proxy para todos os clientes.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3001'],
    credentials: true,
  });

  // Timeout de 5 minutos SOMENTE em requisição mutante nos prefixos de rota
  // que de fato hospedam upload multipart (endpoints com FileInterceptor).
  // Prefixo ancorado — sem casamento por substring, que dava 5 min a
  // qualquer rota com "upload"/"assets"/"images" no caminho.
  const UPLOAD_TIMEOUT_METHODS = new Set(['POST', 'PUT', 'PATCH']);
  const UPLOAD_TIMEOUT_ROUTES: RegExp[] = [
    /^\/api\/cms\//, // assets, blogs, authors, articles/:id/images
  ];
  const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

  app.use((req: Request, res: Response, next: NextFunction) => {
    const isUploadRoute =
      UPLOAD_TIMEOUT_METHODS.has(req.method) &&
      UPLOAD_TIMEOUT_ROUTES.some((route) => route.test(req.path));

    if (isUploadRoute) {
      req.setTimeout(UPLOAD_TIMEOUT_MS);
      res.setTimeout(UPLOAD_TIMEOUT_MS);
      req.on('error', (error: Error) => logger.error(`Erro no stream da requisição: ${error.message}`));
      res.on('error', (error: Error) => logger.error(`Erro no stream da resposta: ${error.message}`));
    }

    next();
  });

  // whitelist remove campos de body/query sem decorator do class-validator
  // (proteção contra mass assignment). forbidNonWhitelisted fica desligado
  // até os clientes serem observados limpos em staging — ligar agora
  // transformaria um campo extra inofensivo em 400.
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(
    new ConnectionErrorFilter(httpAdapterHost.httpAdapter), // primeiro: captura erro de conexão
    new PrismaExceptionFilter(),
    new DomainExceptionFilter(),
    new MulterExceptionFilter(),
  );

  const { version } = require('../package.json') as { version: string };
  const swaggerMounted = setupSwagger(app, version);

  await app.listen(process.env.PORT);

  logger.log(`🚀 Aplicação rodando em: http://localhost:${process.env.PORT}`);
  if (swaggerMounted) {
    logger.log(`📚 Documentação Swagger em: http://localhost:${process.env.PORT}/api/docs`);
  }

  // Encerramento gracioso: fecha conexões HTTP, Prisma e Bull antes de sair.
  const gracefulShutdown = async (signal: string) => {
    logger.log(`${signal} recebido. Iniciando encerramento gracioso...`);
    try {
      await app.close();
      logger.log('Aplicação encerrada com sucesso.');
      process.exit(0);
    } catch (error) {
      logger.error('Erro durante o encerramento:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}
bootstrap();
