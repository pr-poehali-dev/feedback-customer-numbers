CREATE TABLE IF NOT EXISTS phone_numbers (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(32) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    phone_id INTEGER NOT NULL REFERENCES phone_numbers(id),
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    verdict VARCHAR(16) NOT NULL DEFAULT 'risky',
    author VARCHAR(120),
    comment TEXT NOT NULL,
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_phone_id ON reviews(phone_id);

INSERT INTO phone_numbers (phone) VALUES
('+7 (912) 345-67-89'),
('+7 (903) 222-11-00'),
('+7 (495) 777-88-99'),
('+7 (921) 100-50-30')
ON CONFLICT (phone) DO NOTHING;

INSERT INTO reviews (phone_id, rating, verdict, author, comment, tags)
SELECT p.id, 5, 'safe', 'Анна Д.', 'Отличный заказчик, оплата без задержек.', 'Платит вовремя,Адекватный'
FROM phone_numbers p WHERE p.phone = '+7 (912) 345-67-89';

INSERT INTO reviews (phone_id, rating, verdict, author, comment, tags)
SELECT p.id, 2, 'risky', 'Игорь М.', 'Долго тянул с оплатой, в итоге заплатил не всё.', 'Задержки оплаты,Меняет ТЗ'
FROM phone_numbers p WHERE p.phone = '+7 (903) 222-11-00';

INSERT INTO reviews (phone_id, rating, verdict, author, comment, tags)
SELECT p.id, 1, 'scam', 'Сергей К.', 'Пропал после сдачи работы. Деньги не отдал.', 'Не платит,Кидала'
FROM phone_numbers p WHERE p.phone = '+7 (495) 777-88-99';

INSERT INTO reviews (phone_id, rating, verdict, author, comment, tags)
SELECT p.id, 5, 'safe', 'Мария Л.', 'Работаю не первый раз — всё чётко.', 'Топ заказчик,Рекомендую'
FROM phone_numbers p WHERE p.phone = '+7 (921) 100-50-30';