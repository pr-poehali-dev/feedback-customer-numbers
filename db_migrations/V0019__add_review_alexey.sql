-- Алексей (должник) — новый номер
INSERT INTO phone_numbers (phone) VALUES ('+7 909 990-30-69')
ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone;

INSERT INTO reviews (phone_id, rating, verdict, author, customer_name, object_address, comment, tags)
SELECT id, 1, 'scam', 'Аноним', 'Алексей', '',
  'Алексей должен 9000 руб. и не отдаёт. Ведёт себя очень нагло. Не работайте с ним — будьте бдительны!',
  'не платит, долг'
FROM phone_numbers WHERE phone = '+7 909 990-30-69';