DROP INDEX IF EXISTS "Article_blog_id_status_display_order_idx";

ALTER TABLE "Article"
DROP COLUMN IF EXISTS "display_order";

CREATE INDEX "Article_blog_id_status_published_at_idx"
ON "Article"("blog_id", "status", "published_at");