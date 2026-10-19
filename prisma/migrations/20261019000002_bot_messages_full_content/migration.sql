-- Conversa inteira: texto completo, id da mensagem no WhatsApp e dados de midia.
ALTER TABLE "bot_messages" ADD COLUMN "content" TEXT,
ADD COLUMN "wamid" VARCHAR(120),
ADD COLUMN "media_kind" VARCHAR(20),
ADD COLUMN "media_text" TEXT,
ADD COLUMN "caption" TEXT;

CREATE UNIQUE INDEX "bot_messages_tenant_id_wamid_key" ON "bot_messages"("tenant_id", "wamid");
