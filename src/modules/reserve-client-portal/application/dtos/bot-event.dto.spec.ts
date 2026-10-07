import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BotEventBatchDto } from './bot-event.dto';

const lote = (type: string) => plainToInstance(BotEventBatchDto, {
  tenant_id: 'cli_dona_tereza',
  events: [{ event_id: 'e1', occurred_at: '2026-10-07T12:00:00.000Z', type, contact: { phone: '5535900000000' } }],
});

describe('BotEventBatchDto (B5)', () => {
  it.each(['aviso.esgotou', 'aviso.pagamento_vencendo', 'aviso.ultima_unidade', 'painel.erro_envio'])(
    'aceita tipo fora do catalogo: %s', async (type) => {
      expect(await validate(lote(type))).toHaveLength(0);
    },
  );
  it('recusa type com mais de 50 caracteres', async () => {
    expect((await validate(lote('x'.repeat(51)))).length).toBeGreaterThan(0);
  });
});
