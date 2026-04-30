import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { MulterExceptionFilter } from './shared/exceptions/multer-exception.filter';
import { DomainExceptionFilter } from './shared/exceptions/domain-exception.filter';

async function bootstrap() {
  // rawBody: true enables access to req.rawBody for Stripe webhook signature validation
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: '*',
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalFilters(new DomainExceptionFilter(), new MulterExceptionFilter());

  // Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('Zarp Admin API')
    .setDescription(`
      API de gerenciamento e administração do sistema Zarp
      
      ## Módulos API
      - **Subscriptions**: Gerenciamento de assinaturas recorrentes com Stripe
      - **Event Notification (SMS)**: Gestão de notificações SMS com webhooks
      - **Lead Management**: Gerenciamento de leads e prospects
      - **Email Campaign**: Campanhas de email marketing com segmentação
      - **Config**: Configuração de servidores SMTP
    `)
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Token JWT para autenticação admin'
    })
    .addTag('Subscriptions', 'API para gerenciamento de assinaturas Stripe')
    .addTag('Webhooks', 'Endpoints para webhooks externos (Stripe, etc)')
    .addTag('Event Notification (SMS)', 'API para gerenciamento de notificações SMS e webhooks')
    .addTag('Lead Management', 'API para gerenciamento de leads')
    .addTag('Email Campaign', 'API para campanhas de email marketing')
    .addTag('Config (SMTP Server)', 'API para configuração de servidores SMTP')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  console.log(process.env.PORT)
  await app.listen(process.env.PORT);
  
  console.log(`\n🚀 Aplicação rodando em: http://localhost:${process.env.PORT}`);
  console.log(`📚 Documentação Swagger disponível em: http://localhost:${process.env.PORT}/api/docs\n`);
}
bootstrap();
