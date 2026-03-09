ALTER TABLE "Article"
ADD COLUMN IF NOT EXISTS "language" VARCHAR(10);

UPDATE "Article"
SET "language" = 'en_us'
WHERE "language" IS NULL OR "language" = '';

ALTER TABLE "Article"
ALTER COLUMN "language" SET DEFAULT 'en_us',
ALTER COLUMN "language" SET NOT NULL;

DROP INDEX IF EXISTS "Article_blog_id_status_display_order_idx";

ALTER TABLE "Article"
DROP COLUMN IF EXISTS "display_order";

CREATE INDEX IF NOT EXISTS "Article_blog_id_status_published_at_idx"
ON "Article"("blog_id", "status", "published_at");