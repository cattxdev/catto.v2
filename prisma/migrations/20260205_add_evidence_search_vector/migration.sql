-- Add search_vector column for full-text search on evidence
ALTER TABLE "evidence" ADD COLUMN "search_vector" TSVECTOR;

-- Create GIN index for fast full-text queries
CREATE INDEX "evidence_search_vector_idx" ON "evidence" USING GIN ("search_vector");

-- Create trigger function to auto-update search_vector
CREATE OR REPLACE FUNCTION evidence_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.original_filename, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Create trigger to run on INSERT or UPDATE
CREATE TRIGGER evidence_search_update
  BEFORE INSERT OR UPDATE ON "evidence"
  FOR EACH ROW EXECUTE FUNCTION evidence_search_trigger();

-- Backfill existing records by triggering the update
UPDATE "evidence" SET description = description;
