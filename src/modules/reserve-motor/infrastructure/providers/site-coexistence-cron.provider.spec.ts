import {
  SITE_HSYSTEM_EVENTO,
  SITE_HSYSTEM_FLAG_KEY,
  SITE_HSYSTEM_FLAG_MODULE,
  SITE_HSYSTEM_MENSAGEM,
  SiteCoexistenceCronProvider,
} from './site-coexistence-cron.provider';

function buildDeps(flags: { tenant_id: string; value: unknown }[]) {
  const prisma = {
    tenantSetting: { findMany: jest.fn().mockResolvedValue(flags) },
  };
  const botEvents = { dispatch: jest.fn().mockResolvedValue(undefined) };
  return { prisma, botEvents };
}

describe('SiteCoexistenceCronProvider', () => {
  it('despacha rotina.site_hsystem SO para tenants com a flag ligada', async () => {
    const { prisma, botEvents } = buildDeps([
      { tenant_id: 't_ligado', value: true },
      { tenant_id: 't_desligado', value: false },
      { tenant_id: 't_lixo', value: 'sim' },
    ]);
    const provider = new SiteCoexistenceCronProvider(prisma as any, botEvents as any);
    await provider.lembreteDiario();
    expect(botEvents.dispatch).toHaveBeenCalledTimes(1);
    expect(botEvents.dispatch).toHaveBeenCalledWith('t_ligado', SITE_HSYSTEM_EVENTO, {
      mensagem: SITE_HSYSTEM_MENSAGEM,
    });
  });

  it('le a flag em UMA query pelo par module/key do tenant_settings', async () => {
    const { prisma, botEvents } = buildDeps([]);
    const provider = new SiteCoexistenceCronProvider(prisma as any, botEvents as any);
    await provider.lembreteDiario();
    expect(prisma.tenantSetting.findMany).toHaveBeenCalledWith({
      where: { module: SITE_HSYSTEM_FLAG_MODULE, key: SITE_HSYSTEM_FLAG_KEY },
      select: { tenant_id: true, value: true },
    });
    expect(botEvents.dispatch).not.toHaveBeenCalled();
  });

  it('falha em um tenant nao interrompe os demais', async () => {
    const { prisma, botEvents } = buildDeps([
      { tenant_id: 't_1', value: true },
      { tenant_id: 't_2', value: true },
    ]);
    botEvents.dispatch.mockRejectedValueOnce(new Error('webhook fora do ar'));
    const provider = new SiteCoexistenceCronProvider(prisma as any, botEvents as any);
    await provider.lembreteDiario();
    expect(botEvents.dispatch).toHaveBeenCalledTimes(2);
    expect(botEvents.dispatch).toHaveBeenLastCalledWith('t_2', SITE_HSYSTEM_EVENTO, {
      mensagem: SITE_HSYSTEM_MENSAGEM,
    });
  });

  it('lembrete do plano: cadastrar a reserva do site no motor no mesmo dia', () => {
    expect(SITE_HSYSTEM_MENSAGEM).toBe(
      'Alguma reserva entrou pelo site hoje? Cadastre no motor antes de fechar o dia.',
    );
  });
});
