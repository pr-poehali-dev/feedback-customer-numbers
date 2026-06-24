CREATE TABLE IF NOT EXISTS message_reactions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL,
    user_phone VARCHAR(32) NOT NULL,
    emoji VARCHAR(16) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (message_id, user_phone, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_msg ON message_reactions(message_id);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS author_phone VARCHAR(32);