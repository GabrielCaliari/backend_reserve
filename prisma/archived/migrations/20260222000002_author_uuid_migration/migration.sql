-- Migration: Convert Author.id from Int to UUID (12-character cuid)
-- This migration preserves all existing Author records and updates Article.author_id references

-- Step 1: Add temporary UUID column to Author
ALTER TABLE "Author" ADD COLUMN "id_uuid" VARCHAR(12);

-- Step 2: Generate UUIDs for all existing Author records
DO $$
DECLARE
    author_record RECORD;
    new_uuid VARCHAR(12);
BEGIN
    FOR author_record IN SELECT id FROM "Author" ORDER BY id
    LOOP
        -- Generate a 12-character UUID-like string (cuid format)
        new_uuid := SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 12);
        
        -- Ensure uniqueness
        WHILE EXISTS (SELECT 1 FROM "Author" WHERE id_uuid = new_uuid) LOOP
            new_uuid := SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 12);
        END LOOP;
        
        UPDATE "Author" SET id_uuid = new_uuid WHERE id = author_record.id;
    END LOOP;
END $$;

-- Step 3: Add temporary author_id_uuid column to Article
ALTER TABLE "Article" ADD COLUMN "author_id_uuid" VARCHAR(12);

-- Step 4: Map Article.author_id to new Author UUIDs
UPDATE "Article" art
SET author_id_uuid = au.id_uuid
FROM "Author" au
WHERE art.author_id = au.id;

-- Step 5: Drop old foreign key constraint
ALTER TABLE "Article" DROP CONSTRAINT IF EXISTS "Article_author_id_fkey";

-- Step 6: Drop old Author.id primary key
ALTER TABLE "Author" DROP CONSTRAINT IF EXISTS "Author_pkey";

-- Step 7: Drop old Author.id column and rename id_uuid to id
ALTER TABLE "Author" DROP COLUMN "id";
ALTER TABLE "Author" RENAME COLUMN "id_uuid" TO "id";

-- Step 8: Set Author.id as primary key
ALTER TABLE "Author" ADD PRIMARY KEY ("id");

-- Step 9: Update Article.author_id
ALTER TABLE "Article" DROP COLUMN "author_id";
ALTER TABLE "Article" RENAME COLUMN "author_id_uuid" TO "author_id";

-- Step 10: Add foreign key constraint back
ALTER TABLE "Article" 
ADD CONSTRAINT "Article_author_id_fkey" 
FOREIGN KEY ("author_id") REFERENCES "Author"("id");

-- Step 11: Update MediaAssetRelation for author references (if any exist)
-- Add temporary entity_id_uuid column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'media_asset_relations' 
        AND column_name = 'entity_id_uuid_temp'
    ) THEN
        ALTER TABLE "media_asset_relations" ADD COLUMN "entity_id_uuid_temp" VARCHAR(12);
    END IF;
END $$;

-- Map entity_id to new Author UUIDs for author relations
UPDATE "media_asset_relations" mar
SET entity_id_uuid_temp = au.id
FROM "Author" au
WHERE mar.entity_type = 'author' 
  AND mar.entity_id::INT = au.id::INT;

-- Update entity_id for author relations
UPDATE "media_asset_relations"
SET entity_id = entity_id_uuid_temp
WHERE entity_type = 'author' AND entity_id_uuid_temp IS NOT NULL;

-- Set entity_id_type to 'uuid' for author relations
UPDATE "media_asset_relations"
SET entity_id_type = 'uuid'
WHERE entity_type = 'author';

-- Drop temporary column
ALTER TABLE "media_asset_relations" DROP COLUMN IF EXISTS "entity_id_uuid_temp";

-- Step 12: Recreate indexes
CREATE INDEX IF NOT EXISTS "Author_tenant_id_idx" ON "Author"("tenant_id");
CREATE INDEX IF NOT EXISTS "Author_active_idx" ON "Author"("active");

-- Verification: Check that all authors have UUIDs
DO $$
DECLARE
    author_count INT;
    uuid_count INT;
    article_author_count INT;
BEGIN
    SELECT COUNT(*) INTO author_count FROM "Author";
    SELECT COUNT(*) INTO uuid_count FROM "Author" WHERE id IS NOT NULL AND LENGTH(id) = 12;
    SELECT COUNT(*) INTO article_author_count FROM "Article" WHERE author_id IS NOT NULL;
    
    IF author_count != uuid_count THEN
        RAISE EXCEPTION 'Author UUID migration failed: % authors but only % have valid UUIDs', author_count, uuid_count;
    END IF;
    
    -- Verify all Article.author_id references are valid
    IF EXISTS (
        SELECT 1 FROM "Article" a 
        WHERE a.author_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM "Author" au WHERE au.id = a.author_id)
    ) THEN
        RAISE EXCEPTION 'Author UUID migration failed: Some articles reference non-existent authors';
    END IF;
    
    RAISE NOTICE 'Author UUID migration successful: % authors migrated, % article references updated', author_count, article_author_count;
END $$;
