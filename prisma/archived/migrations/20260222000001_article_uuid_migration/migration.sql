-- Migration: Convert Article.id from Int to UUID (12-character cuid)
-- This migration preserves all existing Article records and updates all foreign key references

-- Step 1: Add temporary UUID column to Article
ALTER TABLE "Article" ADD COLUMN "id_uuid" VARCHAR(12);

-- Step 2: Generate UUIDs for all existing Article records
-- Using a combination of timestamp and random string to create 12-char unique IDs
DO $$
DECLARE
    article_record RECORD;
    new_uuid VARCHAR(12);
BEGIN
    FOR article_record IN SELECT id FROM "Article" ORDER BY id
    LOOP
        -- Generate a 12-character UUID-like string (cuid format)
        new_uuid := SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 12);
        
        -- Ensure uniqueness
        WHILE EXISTS (SELECT 1 FROM "Article" WHERE id_uuid = new_uuid) LOOP
            new_uuid := SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 12);
        END LOOP;
        
        UPDATE "Article" SET id_uuid = new_uuid WHERE id = article_record.id;
    END LOOP;
END $$;

-- Step 3: Add temporary article_id_uuid column to ArticleImage (deprecated table)
ALTER TABLE "article_images_deprecated" ADD COLUMN "article_id_uuid" VARCHAR(12);

-- Step 4: Map ArticleImage.article_id to new Article UUIDs
UPDATE "article_images_deprecated" ai
SET article_id_uuid = a.id_uuid
FROM "Article" a
WHERE ai.article_id::TEXT = a.id;

-- Step 5: Update MediaAssetRelation for article references
-- Add temporary entity_id_uuid column
ALTER TABLE "media_asset_relations" ADD COLUMN "entity_id_uuid" VARCHAR(12);

-- Map entity_id to new Article UUIDs for article relations
UPDATE "media_asset_relations" mar
SET entity_id_uuid = a.id_uuid
FROM "Article" a
WHERE mar.entity_type = 'article' 
  AND mar.entity_id = a.id;

-- Step 6: Drop old foreign key constraints
ALTER TABLE "article_images_deprecated" DROP CONSTRAINT IF EXISTS "ArticleImage_article_id_fkey";
ALTER TABLE "Article" DROP CONSTRAINT IF EXISTS "Article_pkey";

-- Step 7: Drop old Article.id column and rename id_uuid to id
ALTER TABLE "Article" DROP COLUMN "id";
ALTER TABLE "Article" RENAME COLUMN "id_uuid" TO "id";

-- Step 8: Set Article.id as primary key
ALTER TABLE "Article" ADD PRIMARY KEY ("id");

-- Step 9: Update ArticleImage foreign key
ALTER TABLE "article_images_deprecated" DROP COLUMN "article_id";
ALTER TABLE "article_images_deprecated" RENAME COLUMN "article_id_uuid" TO "article_id";

-- Step 10: Add foreign key constraint back
ALTER TABLE "article_images_deprecated" 
ADD CONSTRAINT "ArticleImage_article_id_fkey" 
FOREIGN KEY ("article_id") REFERENCES "Article"("id") ON DELETE CASCADE;

-- Step 11: Update MediaAssetRelation entity_id for articles
UPDATE "media_asset_relations"
SET entity_id = entity_id_uuid
WHERE entity_type = 'article' AND entity_id_uuid IS NOT NULL;

-- Step 12: Set entity_id_type to 'uuid' for article relations
UPDATE "media_asset_relations"
SET entity_id_type = 'uuid'
WHERE entity_type = 'article';

-- Step 13: Drop temporary column
ALTER TABLE "media_asset_relations" DROP COLUMN "entity_id_uuid";

-- Step 14: Recreate indexes
CREATE INDEX IF NOT EXISTS "Article_blog_id_status_display_order_idx" ON "Article"("blog_id", "status", "display_order");
CREATE INDEX IF NOT EXISTS "Article_author_id_idx" ON "Article"("author_id");
CREATE INDEX IF NOT EXISTS "Article_created_by_idx" ON "Article"("created_by");
CREATE INDEX IF NOT EXISTS "Article_last_edited_by_idx" ON "Article"("last_edited_by");
CREATE UNIQUE INDEX IF NOT EXISTS "Article_slug_blog_id_key" ON "Article"("slug", "blog_id");

-- Step 15: Recreate ArticleImage index
CREATE INDEX IF NOT EXISTS "article_images_deprecated_article_id_display_order_idx" 
ON "article_images_deprecated"("article_id", "display_order");

-- Verification: Check that all articles have UUIDs
DO $$
DECLARE
    article_count INT;
    uuid_count INT;
BEGIN
    SELECT COUNT(*) INTO article_count FROM "Article";
    SELECT COUNT(*) INTO uuid_count FROM "Article" WHERE id IS NOT NULL AND LENGTH(id) = 12;
    
    IF article_count != uuid_count THEN
        RAISE EXCEPTION 'Article UUID migration failed: % articles but only % have valid UUIDs', article_count, uuid_count;
    END IF;
    
    RAISE NOTICE 'Article UUID migration successful: % articles migrated', article_count;
END $$;
