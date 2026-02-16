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
    .setDescription('API de gerenciamento e administração do sistema Zarp')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  console.log(process.env.PORT)
  await app.listen(process.env.PORT);
  
  console.log(`\n🚀 Aplicação rodando em: http://localhost:${process.env.PORT}`);
  console.log(`📚 Documentação Swagger disponível em: http://localhost:${process.env.PORT}/api/docs\n`);
}
bootstrap();
