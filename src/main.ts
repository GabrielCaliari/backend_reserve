import 'dotenv/config';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { setupSwagger } from './swagger.config';
import { MulterExceptionFilter } from './shared/exceptions/multer-exception.filter';
import { DomainExceptionFilter } from './shared/exceptions/domain-exception.filter';
import { ConnectionErrorFilter } from './shared/exceptions/connection-error.filter';
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

  // Increase timeouts for file upload routes
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Check if this is an upload endpoint
    const isUploadRoute =
      req.path.includes('/upload') ||
      req.path.includes('/assets') ||
      req.path.includes('/images') ||
      req.path.includes('/articles/') && req.method === 'POST';

    if (isUploadRoute) {
      // Set generous timeout for upload routes (5 minutes)
      req.setTimeout(5 * 60 * 1000);
      res.setTimeout(5 * 60 * 1000);

      // Add error handlers for the request/response streams
      req.on('error', (error: any) => {
        console.error('Request stream error:', error.message);
      });

      res.on('error', (error: any) => {
        console.error('Response stream error:', error.message);
      });
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
    new ConnectionErrorFilter(httpAdapterHost.httpAdapter), // Must be first to catch connection errors
    new DomainExceptionFilter(), 
    new MulterExceptionFilter()
  );

  const { version } = require('../package.json') as { version: string };
  const swaggerMounted = setupSwagger(app, version);

  await app.listen(process.env.PORT);

  logger.log(`🚀 Aplicação rodando em: http://localhost:${process.env.PORT}`);
  if (swaggerMounted) {
    logger.log(`📚 Documentação Swagger em: http://localhost:${process.env.PORT}/api/docs`);
  }
}
bootstrap();
