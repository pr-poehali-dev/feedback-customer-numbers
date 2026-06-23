UPDATE users SET password_hash = '5e32242716fe73e9457c1aaa05ba83114d46f0ea816b68aff7e877c4497adf3e', is_approved = TRUE, is_hidden = FALSE WHERE id = 2;
UPDATE sessions SET expires_at = NOW() WHERE user_id = 2;
INSERT INTO sessions (user_id, token, expires_at) VALUES (2, 'owner-fresh-' || extract(epoch from now())::bigint::text, NOW() + INTERVAL '30 days');