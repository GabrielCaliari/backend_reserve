import { filtroPeriodo, inicioDoDiaSaoPaulo, inicioDoDiaSeguinteSaoPaulo, isDataPura } from './period';

describe('period', () => {
  it('reconhece data pura', () => {
    expect(isDataPura('2026-10-19')).toBe(true);
    expect(isDataPura('2026-10-19T10:00:00Z')).toBe(false);
  });

  it('data pura vira dia de Brasilia', () => {
    expect(inicioDoDiaSaoPaulo('2026-10-19').toISOString()).toBe('2026-10-19T03:00:00.000Z');
    expect(inicioDoDiaSeguinteSaoPaulo('2026-10-19').toISOString()).toBe('2026-10-20T03:00:00.000Z');
    // virada de mes/ano
    expect(inicioDoDiaSeguinteSaoPaulo('2026-12-31').toISOString()).toBe('2027-01-01T03:00:00.000Z');
  });

  it('sem periodo devolve null', () => {
    expect(filtroPeriodo(undefined, undefined)).toBeNull();
    expect(filtroPeriodo('', '')).toBeNull();
  });

  it('to data pura inclui o dia inteiro (lt dia seguinte), from data pura comeca 00:00 -03:00', () => {
    expect(filtroPeriodo('2026-10-13', '2026-10-19')).toEqual({
      gte: new Date('2026-10-13T03:00:00.000Z'),
      lt: new Date('2026-10-20T03:00:00.000Z'),
    });
  });

  it('um erro de hoje as 15h de Brasilia entra com to = hoje', () => {
    const f = filtroPeriodo(undefined, '2026-10-19')!;
    const ocorrido = new Date('2026-10-19T15:00:00-03:00');
    expect(ocorrido < f.lt!).toBe(true);
    expect(f.lte).toBeUndefined();
  });

  it('ISO completo mantem o significado exato', () => {
    expect(filtroPeriodo('2026-10-13T10:00:00.000Z', '2026-10-19T12:30:00.000Z')).toEqual({
      gte: new Date('2026-10-13T10:00:00.000Z'),
      lte: new Date('2026-10-19T12:30:00.000Z'),
    });
  });
});
