import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateBotIntegrationConfigDto, UpdateBotIntegrationConfigDto } from './bot-integration-config.dto';

describe('BotIntegrationConfig DTOs (urls do n8n)', () => {
  const erros = async (cls: any, body: Record<string, unknown>) =>
    (await validate(plainToInstance(cls, body) as object)).map((e) => e.property);

  for (const cls of [CreateBotIntegrationConfigDto, UpdateBotIntegrationConfigDto]) {
    describe(cls.name, () => {
      it('aceita string vazia nas duas urls (limpar)', async () => {
        expect(await erros(cls, { n8n_motor_webhook_url: '', n8n_panel_webhook_url: '' })).toEqual([]);
      });

      it('aceita url valida e ausencia', async () => {
        expect(await erros(cls, { n8n_motor_webhook_url: 'https://n8n.example/webhook/motor' })).toEqual([]);
        expect(await erros(cls, {})).toEqual([]);
      });

      it('rejeita texto que nao e url', async () => {
        expect(await erros(cls, { n8n_motor_webhook_url: 'nao e url', n8n_panel_webhook_url: 'x y' })).toEqual(
          expect.arrayContaining(['n8n_motor_webhook_url', 'n8n_panel_webhook_url']),
        );
      });
    });
  }
});
