CREATE TABLE IF NOT EXISTS participants (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(200) NOT NULL,
  organization VARCHAR(300),
  work_direction VARCHAR(300),
  phone VARCHAR(50) NOT NULL,
  device_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);