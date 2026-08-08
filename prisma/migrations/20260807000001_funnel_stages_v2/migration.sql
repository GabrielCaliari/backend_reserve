-- Funil v2: reescreve EFunnelStage de 5 para 9 etapas e adiciona o subtipo de
-- publico no contato.
--
-- Enum do Postgres nao aceita "renomear em massa": os valores mudam de nome E
-- entram valores novos no meio da ordem. ALTER TYPE ... RENAME VALUE resolveria
-- os renomeados, mas ADD VALUE nao e permitido junto com uso do tipo na mesma
-- transacao em que o valor e criado, e o Prisma roda cada migration dentro de
-- uma transacao. Por isso a estrategia e a mesma que o proprio engine do Prisma
-- emite: cria o tipo novo, converte os dados com CASE explicito, troca as
-- colunas, e so entao derruba o tipo antigo.

-- 1. Tipo novo, na ordem do funil (a ordem de declaracao vira a ordem do enum
--    no banco e precisa bater com o schema.prisma para nao acusar drift).
CREATE TYPE "EFunnelStage_new" AS ENUM (
    'CONTATO_INICIADO',
    'PUBLICO_IDENTIFICADO',
    'QUALIFICADO',
    'ACOMODACAO_APRESENTADA',
    'OFERTA_FEITA',
    'FECHAMENTO_INICIADO',
    'COMPROVANTE_RECEBIDO',
    'RESERVA_CONFIRMADA',
    'PERDIDO'
);

-- 2. O default precisa cair antes do ALTER COLUMN: 'NOVO' nao existe no tipo
--    novo e o Postgres tenta recastar o default junto com a coluna.
ALTER TABLE "bot_leads" ALTER COLUMN "current_stage" DROP DEFAULT;

-- 3. Conversao dos dados. Mapeamento confirmado pelo dono do produto:
--      NOVO       -> CONTATO_INICIADO
--      QUALIFICADO-> QUALIFICADO
--      PAGAMENTO  -> FECHAMENTO_INICIADO   (nao COMPROVANTE_RECEBIDO)
--      FECHADO    -> RESERVA_CONFIRMADA
--      FRIO       -> PERDIDO
--    As 4 etapas novas (PUBLICO_IDENTIFICADO, ACOMODACAO_APRESENTADA,
--    OFERTA_FEITA, COMPROVANTE_RECEBIDO) nascem sem historico: nenhum registro
--    antigo mapeia para elas, e isso e esperado.
--    O CASE nao tem ELSE de proposito: se aparecer um valor fora do dominio
--    conhecido o CASE devolve NULL e a migration falha no NOT NULL de
--    para_estagio/current_stage, em vez de silenciosamente achatar o dado.
--    de_estagio e nullable: CASE sobre NULL devolve NULL, que e o desejado.
--    Os indices sobre as colunas (inclusive funil_eventos(tenant_id,
--    para_estagio)) sao reconstruidos pelo proprio ALTER TABLE.
ALTER TABLE "funil_eventos"
    ALTER COLUMN "de_estagio" TYPE "EFunnelStage_new"
        USING (
            CASE "de_estagio"::text
                WHEN 'NOVO' THEN 'CONTATO_INICIADO'
                WHEN 'QUALIFICADO' THEN 'QUALIFICADO'
                WHEN 'PAGAMENTO' THEN 'FECHAMENTO_INICIADO'
                WHEN 'FECHADO' THEN 'RESERVA_CONFIRMADA'
                WHEN 'FRIO' THEN 'PERDIDO'
            END
        )::"EFunnelStage_new",
    ALTER COLUMN "para_estagio" TYPE "EFunnelStage_new"
        USING (
            CASE "para_estagio"::text
                WHEN 'NOVO' THEN 'CONTATO_INICIADO'
                WHEN 'QUALIFICADO' THEN 'QUALIFICADO'
                WHEN 'PAGAMENTO' THEN 'FECHAMENTO_INICIADO'
                WHEN 'FECHADO' THEN 'RESERVA_CONFIRMADA'
                WHEN 'FRIO' THEN 'PERDIDO'
            END
        )::"EFunnelStage_new";

ALTER TABLE "bot_leads"
    ALTER COLUMN "current_stage" TYPE "EFunnelStage_new"
        USING (
            CASE "current_stage"::text
                WHEN 'NOVO' THEN 'CONTATO_INICIADO'
                WHEN 'QUALIFICADO' THEN 'QUALIFICADO'
                WHEN 'PAGAMENTO' THEN 'FECHAMENTO_INICIADO'
                WHEN 'FECHADO' THEN 'RESERVA_CONFIRMADA'
                WHEN 'FRIO' THEN 'PERDIDO'
            END
        )::"EFunnelStage_new";

-- 4. Troca dos tipos.
DROP TYPE "EFunnelStage";
ALTER TYPE "EFunnelStage_new" RENAME TO "EFunnelStage";

-- 5. Default novo, equivalente ao 'NOVO' antigo.
ALTER TABLE "bot_leads" ALTER COLUMN "current_stage" SET DEFAULT 'CONTATO_INICIADO';

-- 6. Historico: os registros que eram FRIO viram PERDIDO sem "motivo"
--    preenchido -- o campo nem existia como obrigatorio quando foram gravados.
--    Ficam com motivo NULL de proposito (backfill seria inventar dado); a
--    obrigatoriedade do motivo em PERDIDO vale so para escrita nova e e
--    aplicada na camada de aplicacao (DTO + FunnelService), nao por constraint,
--    justamente para nao invalidar esse historico.

-- 7. Subtipo do publico identificado, como atributo do contato.
CREATE TYPE "EBotContactAudience" AS ENUM (
    'LEAD',
    'HOSPEDE_EM_ESTADIA',
    'MENSALISTA',
    'MARINA',
    'EQUIPE'
);

ALTER TABLE "bot_contacts" ADD COLUMN "tipo_publico" "EBotContactAudience";
