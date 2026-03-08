ALTER TABLE "Article"
ADD COLUMN "language" VARCHAR(10) NOT NULL DEFAULT 'en_us';

UPDATE "Article"
SET "language" = 'en_us'
WHERE "language" IS NULL OR "language" = '';