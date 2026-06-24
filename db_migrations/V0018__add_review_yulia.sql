-- Юлия (недобросовестная заказчица) — новый номер
INSERT INTO phone_numbers (phone) VALUES ('+7 909 666-40-17')
ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone;

INSERT INTO reviews (phone_id, rating, verdict, author, customer_name, object_address, comment, tags)
SELECT id, 1, 'scam', 'Аноним', 'Юлия', 'Чехов, д. Ходаево, ул. Спортивная, д. 1/1',
  'Недобросовестная заказчица. Заказывает рабочих, оставляет людей на переработку под непонятным предлогом, придирается и не доплачивает за работу. Будьте бдительны!',
  'не доплачивает, переработка, придирается'
FROM phone_numbers WHERE phone = '+7 909 666-40-17';