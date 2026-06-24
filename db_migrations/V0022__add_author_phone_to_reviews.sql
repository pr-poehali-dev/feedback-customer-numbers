ALTER TABLE reviews ADD COLUMN IF NOT EXISTS author_phone VARCHAR(32);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_reviews_author_phone ON reviews(author_phone);