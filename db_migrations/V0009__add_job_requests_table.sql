CREATE TABLE IF NOT EXISTS job_requests (
  id SERIAL PRIMARY KEY,
  address TEXT NOT NULL,
  workers INTEGER NOT NULL,
  hours NUMERIC(6,1) NOT NULL,
  price VARCHAR(200),
  phone VARCHAR(50) NOT NULL,
  work_type TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);