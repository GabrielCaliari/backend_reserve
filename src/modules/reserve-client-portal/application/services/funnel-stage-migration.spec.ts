import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Trava o mapeamento da migration do funil v2 (20260807000001_funnel_stages_v2).
 *
 * O mapeamento das 5 etapas antigas para as 9 novas foi confirmado pelo dono do
 * produto e nao pode ser "corrigido por intuicao" depois -- PAGAMENTO em
 * especial vai para FECHAMENTO_INICIADO, nao para COMPROVANTE_RECEBIDO, que e o
 * palpite natural pelo nome. Como a migration ja rodou em banco, alterar o SQL
 * nao reescreve dado nenhum: o unico jeito barato de proteger a decisao e
 * falhar aqui se alguem editar o arquivo.
 */
const REPO_ROOT = join(__dirname, '..', '..', '..', '..', '..');
const MIGRATION_SQL = readFileSync(
  join(REPO_ROOT, 'prisma', 'migrations', '20260807000001_funnel_stages_v2', 'migration.sql'),
  'utf8',
);
const SCHEMA_PRISMA = readFileSync(join(REPO_ROOT, 'prisma', 'schema.prisma'), 'utf8');

const STAGES_IN_ORDER = [
  'CONTATO_INICIADO',
  'PUBLICO_IDENTIFICADO',
  'QUALIFICADO',
  'ACOMODACAO_APRESENTADA',
  'OFERTA_FEITA',
  'FECHAMENTO_INICIADO',
  'COMPROVANTE_RECEBIDO',
  'RESERVA_CONFIRMADA',
  'PERDIDO',
];

/** Mapeamento confirmado pelo dono do produto. */
const CONFIRMED_MAPPING: Record<string, string> = {
  NOVO: 'CONTATO_INICIADO',
  QUALIFICADO: 'QUALIFICADO',
  PAGAMENTO: 'FECHAMENTO_INICIADO',
  FECHADO: 'RESERVA_CONFIRMADA',
  FRIO: 'PERDIDO',
};

/** As 3 colunas que carregavam EFunnelStage e precisam da mesma conversao. */
const CONVERTED_COLUMNS = ['de_estagio', 'para_estagio', 'current_stage'];

describe('migration 20260807000001_funnel_stages_v2', () => {
  it('cria o enum novo com as 9 etapas na ordem do funil', () => {
    const createType = /CREATE TYPE "EFunnelStage_new" AS ENUM \(([\s\S]*?)\);/.exec(MIGRATION_SQL);
    expect(createType).not.toBeNull();

    const values = [...createType![1].matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
    expect(values).toEqual(STAGES_IN_ORDER);
  });

  it('a ordem do enum no schema.prisma bate com a da migration (senao o Prisma acusa drift)', () => {
    const enumBlock = /enum EFunnelStage \{([\s\S]*?)\}/.exec(SCHEMA_PRISMA);
    expect(enumBlock).not.toBeNull();

    const values = enumBlock![1]
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('/'));
    expect(values).toEqual(STAGES_IN_ORDER);
  });

  it.each(CONVERTED_COLUMNS)(
    'converte %s com o mapeamento confirmado pelo dono',
    (column) => {
      // Isola o bloco CASE daquela coluna especifica.
      const caseBlock = new RegExp(
        `CASE "${column}"::text([\\s\\S]*?)END`,
      ).exec(MIGRATION_SQL);
      expect(caseBlock).not.toBeNull();

      const pairs = [...caseBlock![1].matchAll(/WHEN '([A-Z_]+)' THEN '([A-Z_]+)'/g)];
      const mapping = Object.fromEntries(pairs.map((p) => [p[1], p[2]]));

      expect(mapping).toEqual(CONFIRMED_MAPPING);
    },
  );

  it('nao tem ELSE nos CASE: valor fora do dominio deve quebrar a migration, nao virar default', () => {
    // Sem ELSE, um valor inesperado vira NULL e estoura o NOT NULL de
    // para_estagio/current_stage -- falha alto em vez de achatar dado.
    const caseBlocks = [...MIGRATION_SQL.matchAll(/CASE "[a-z_]+"::text([\s\S]*?)END/g)];
    expect(caseBlocks).toHaveLength(CONVERTED_COLUMNS.length);
    for (const block of caseBlocks) {
      expect(block[1]).not.toMatch(/\bELSE\b/);
    }
  });

  it('todas as 5 etapas antigas sao convertidas, sem sobrar orfao', () => {
    for (const legacy of Object.keys(CONFIRMED_MAPPING)) {
      // 3 colunas x 1 WHEN cada.
      const occurrences = [...MIGRATION_SQL.matchAll(new RegExp(`WHEN '${legacy}'`, 'g'))];
      expect(occurrences).toHaveLength(CONVERTED_COLUMNS.length);
    }
  });

  it('as 4 etapas novas nascem sem historico (nenhum WHEN aponta para elas)', () => {
    const semHistorico = [
      'PUBLICO_IDENTIFICADO',
      'ACOMODACAO_APRESENTADA',
      'OFERTA_FEITA',
      'COMPROVANTE_RECEBIDO',
    ];
    const alvos = new Set(Object.values(CONFIRMED_MAPPING));
    for (const stage of semHistorico) {
      expect(alvos.has(stage)).toBe(false);
    }
  });

  it('derruba e recria o default de bot_leads.current_stage', () => {
    // O DROP DEFAULT tem que vir antes do ALTER COLUMN TYPE: o Postgres tenta
    // recastar o default junto com a coluna e 'NOVO' nao existe no tipo novo.
    const dropIdx = MIGRATION_SQL.indexOf('ALTER COLUMN "current_stage" DROP DEFAULT');
    const alterIdx = MIGRATION_SQL.indexOf('ALTER COLUMN "current_stage" TYPE');
    expect(dropIdx).toBeGreaterThan(-1);
    expect(alterIdx).toBeGreaterThan(dropIdx);
    expect(MIGRATION_SQL).toMatch(
      /ALTER COLUMN "current_stage" SET DEFAULT 'CONTATO_INICIADO'/,
    );
  });

  it('troca os tipos e remove o antigo', () => {
    const dropIdx = MIGRATION_SQL.indexOf('DROP TYPE "EFunnelStage"');
    const renameIdx = MIGRATION_SQL.indexOf(
      'ALTER TYPE "EFunnelStage_new" RENAME TO "EFunnelStage"',
    );
    expect(dropIdx).toBeGreaterThan(-1);
    expect(renameIdx).toBeGreaterThan(dropIdx);
  });

  it('adiciona o subtipo de publico como coluna nullable do contato', () => {
    expect(MIGRATION_SQL).toMatch(/CREATE TYPE "EBotContactAudience" AS ENUM/);
    // Nullable de proposito: contato antigo nao tem publico identificado.
    expect(MIGRATION_SQL).toMatch(
      /ADD COLUMN "tipo_publico" "EBotContactAudience";/,
    );
    expect(MIGRATION_SQL).not.toMatch(/"tipo_publico" "EBotContactAudience" NOT NULL/);
  });
});
