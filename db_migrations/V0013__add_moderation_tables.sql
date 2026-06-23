-- Доверенные авторы (по device_id из браузера)
CREATE TABLE IF NOT EXISTS trusted_authors (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(100) UNIQUE NOT NULL,
  approved_at TIMESTAMP DEFAULT NOW()
);

-- Сообщения на модерации
CREATE TABLE IF NOT EXISTS pending_messages (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(100) NOT NULL,
  user_name VARCHAR(200) NOT NULL,
  text TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);