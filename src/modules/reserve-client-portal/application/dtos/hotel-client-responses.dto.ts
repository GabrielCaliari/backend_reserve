import { ApiProperty } from '@nestjs/swagger';

/** Resposta de POST admin/hotel-portal/clients/:id/webhook-secret (so OpenAPI). */
export class WebhookSecretResponseDto {
  @ApiProperty({ description: 'Segredo do Canal C (x-webhook-secret do PMS). Mostrado UMA vez.' }) webhook_secret: string;
}
