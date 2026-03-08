ALTER TABLE "Blog"
ADD COLUMN "media_collection_id" VARCHAR(25);

CREATE INDEX "Blog_media_collection_id_idx"
ON "Blog"("media_collection_id");

ALTER TABLE "Blog"
ADD CONSTRAINT "Blog_media_collection_id_fkey"
FOREIGN KEY ("media_collection_id") REFERENCES "media_collections"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;