import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
  });

  app.useGlobalPipes(new ValidationPipe());

  // Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('Zarp Admin API')
    .setDescription(`
      API de gerenciamento e administração do sistema Zarp
      
      ## Módulos API
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
