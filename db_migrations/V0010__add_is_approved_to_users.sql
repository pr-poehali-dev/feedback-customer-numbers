ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;
-- Владелец (id=2) сразу одобрен
UPDATE users SET is_approved = TRUE WHERE id = 2;