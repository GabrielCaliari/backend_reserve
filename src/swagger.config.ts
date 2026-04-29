import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Swagger fica aberto em qualquer ambiente que não seja produção. Em produção
 * só monta com opt-in explícito (`SWAGGER_ENABLED=true`) — a documentação
 * descreve toda a superfície da API e não deve ficar pública por default.
 */
export function isSwaggerEnabled(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  return process.env.SWAGGER_ENABLED === 'true';
}

export function setupSwagger(app: INestApplication, version: string): boolean {
  if (!isSwaggerEnabled()) return false;

  const config = new DocumentBuilder()
    .setTitle('Reserve Admin API')
    .setDescription(
      [
        'API de gerenciamento e administração do sistema Reserve',
        '',
        '## Módulos API',
        '- **Subscriptions**: Gerenciamento de assinaturas recorrentes com Stripe',
        '- **Event Notification (SMS)**: Gestão de notificações SMS com webhooks',
        '- **Lead Management**: Gerenciamento de leads e prospects',
        '- **Email Campaign**: Campanhas de email marketing com segmentação',
        '- **Config**: Configuração de servidores SMTP',
      ].join('\n'),
    )
    .setVersion(version)
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Token JWT para autenticação admin',
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

  return true;
}
