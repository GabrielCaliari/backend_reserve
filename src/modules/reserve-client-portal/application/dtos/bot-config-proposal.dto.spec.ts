import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateBotConfigProposalDto } from './bot-config-proposal.dto';

const dto = (o: Record<string, unknown>) =>
  plainToInstance(CreateBotConfigProposalDto, { campo: 'hold_min_cartao', categoria: 'policies', valor_proposto: 30, ...o });

describe('CreateBotConfigProposalDto (B6)', () => {
  it.each([30, '33900', 'C', true])('aceita valor simples %p', async (v) => {
    expect(await validate(dto({ valor_proposto: v }))).toHaveLength(0);
  });
  it.each([{ a: 1 }, [1]])('recusa objeto/lista %p', async (v) => {
    expect((await validate(dto({ valor_proposto: v }))).length).toBeGreaterThan(0);
  });
  it.each(['asaas_api_key', 'hospedin_secret', 'webhook_token', 'senha_admin'])('recusa chave de credencial %s', async (campo) => {
    expect((await validate(dto({ campo }))).length).toBeGreaterThan(0);
  });
});
